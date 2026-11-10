/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ElasticsearchClient,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { parse, stringify } from 'yaml';

import {
  PACKAGES_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../../common/constants';

import { packagePolicyService } from '../../package_policy';

import { createArchiveIteratorFromMap } from '../archive/archive_iterator';

import { appContextService } from '../../app_context';

import type { PackageInstallContext, PackageSpecCategory } from '../../../../common/types';

// Define a type for the integration attributes
interface IntegrationAttributes {
  version: string;
  install_source: string;
  [key: string]: any;
}
import {
  CustomIntegrationNotFoundError,
  FleetUnauthorizedError,
  NotACustomIntegrationError,
} from '../../../errors';

import { isTransform } from '../elasticsearch/transform/transform_utils';

import { getInstalledPackageWithAssets } from './get';

import { installPackageWithStateMachine } from './install';

export async function updateCustomIntegration(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  id: string,
  fields: {
    readMeData?: string;
    categories?: PackageSpecCategory[];
  }
) {
  // Get the current integration using the id
  let integration: SavedObject<IntegrationAttributes> | null = null;

  try {
    integration = await soClient.get(PACKAGES_SAVED_OBJECT_TYPE, id);
  } catch (error) {
    // Ignore the error and handle the case where integration is null later
  }

  // if theres no integration, the soClient will throw the error above and we will ignore it so we can handle it with our own here
  if (!integration) {
    throw new CustomIntegrationNotFoundError(`Integration with ID ${id} not found`);
  } else if (
    integration.attributes.install_source !== 'custom' &&
    integration.attributes.install_source !== 'upload'
  ) {
    throw new NotACustomIntegrationError(`Integration with ID ${id} is not a custom integration`);
  }

  // add one to the patch version in the semver
  const newVersion = integration.attributes.version.split('.');
  newVersion[2] = (parseInt(newVersion[2], 10) + 1).toString();
  const newVersionString = newVersion.join('.');
  // Increment the version of everything and create a new package
  const res = await incrementVersionAndUpdate(soClient, esClient, id, {
    version: newVersionString,
    readme: fields.readMeData,
    categories: fields.categories,
  });
  return {
    version: newVersionString,
    status: res.status,
  };
}
// Increments the version of everything, then creates a new package with the new version, readme, etc.
export async function incrementVersionAndUpdate(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  pkgName: string,
  data: {
    version: string;
    readme: string | undefined;
    categories: PackageSpecCategory[] | undefined;
  }
) {
  const installedPkg = await getInstalledPackageWithAssets({
    savedObjectsClient: soClient,
    pkgName,
  });

  const assetsMap = [...installedPkg!.assetsMap.entries()].reduce((acc, [path, content]) => {
    if (path === `${pkgName}-${installedPkg!.installation.install_version}/manifest.yml`) {
      const yaml = parse(content!.toString());
      yaml.version = data.version;

      content = Buffer.from(stringify(yaml));
    }

    acc.set(
      path.replace(`-${installedPkg!.installation.install_version}`, `-${data.version}`),
      content
    );
    return acc;
  }, new Map<string, Buffer | undefined>());

  // update the categories asset as well by editing the manifest.yml, but only if categories is actually defined in the request as its optional and we dont want to replace categories if they dont pass any in
  if (data.categories) {
    const manifestPath = `${pkgName}-${data.version}/manifest.yml`;
    const manifest = assetsMap.get(manifestPath);
    if (manifest) {
      const yaml = parse(manifest?.toString());
      if (yaml) {
        yaml.categories = data.categories || [];
        assetsMap.set(manifestPath, Buffer.from(stringify(yaml)));
      }
    }
  }

  assetsMap.set(
    `${pkgName}-${data.version}/docs/README.md`,
    data.readme ? Buffer.from(data.readme) : Buffer.from('')
  );

  // update the changelog asset as well by adding an entry
  const changelogPath = `${pkgName}-${data.version}/changelog.yml`;
  const changelog = assetsMap.get(changelogPath);
  if (changelog) {
    const yaml = parse(changelog?.toString());
    if (yaml) {
      const newChangelogItem = {
        version: data.version,
        date: new Date().toISOString(),
        changes: [
          {
            type: 'update',
            description: `Edited integration and updated to version ${data.version}`,
            link: 'N/A',
          },
        ],
      };
      yaml.push(newChangelogItem);
      assetsMap.set(changelogPath, Buffer.from(stringify(yaml)));
    }
  }

  const paths = [...assetsMap.keys()];

  // Refuse before the state machine starts, not during it.
  //
  // This replays the stored archive with force: true, so a package that was originally uploaded
  // has its real transforms recreated. Those must not be bound to the editing user — that would
  // make a metadata edit an alternate reauthorization path around the install-source gate in
  // handleTransformReauthorizeAndStart — so no request is passed below and transform
  // installation cannot succeed. Letting it fail in-flight would be worse than refusing: this
  // call omits `installedPkg`, so the first step overwrites the installation saved object with a
  // new-version record and drops its transform and archive references, `keepFailedInstallation`
  // then preserves that state, and installPackageWithStateMachine resolves with `{ error }`
  // rather than throwing — so the route would answer 200 over a damaged installation with an
  // untracked transform. Throwing here leaves the installation untouched and surfaces a 403.
  if (paths.some(isTransform)) {
    throw new FleetUnauthorizedError(
      `Cannot update integration ${pkgName}: its archive contains Elasticsearch transforms, which stay bound to the privileges of the user who installed them and cannot be rebound by an edit. Reinstall the package instead.`
    );
  }

  const packageInfo = {
    ...installedPkg!.packageInfo,
    version: data.version,
  };

  const archiveIterator = createArchiveIteratorFromMap(assetsMap);

  const packageInstallContext: PackageInstallContext = {
    paths,
    packageInfo,
    archiveIterator,
  };
  const res = await installPackageWithStateMachine({
    packageInstallContext,
    pkgName,
    pkgVersion: data.version,
    installSource: 'custom',
    installType: 'install',
    savedObjectsClient: soClient,
    esClient,
    spaceId: 'default',
    force: true,
    paths: packageInstallContext.paths,
    // Deliberately no request. This reinstall replays the stored archive with force: true, so a
    // package that was originally uploaded has its real transforms recreated here. Passing the
    // editing user's request would bind those caller-authored transforms to the editor's
    // Elasticsearch privileges and start them — a README edit would become an alternate
    // reauthorization path, bypassing the install-source gate in handleTransformReauthorizeAndStart.
    // Consequence: editing an uploaded integration that ships transforms fails with a 403 until
    // metadata-only edits stop reinstalling transforms. Failing closed is intended.
    request: undefined,
    keepFailedInstallation: true,
  });

  const policyIdsToUpgrade = await packagePolicyService.listIds(
    appContextService.getInternalUserSOClientWithoutSpaceExtension(),
    {
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
    }
  );

  if (policyIdsToUpgrade.items.length) {
    await packagePolicyService.bulkUpgrade(soClient, esClient, policyIdsToUpgrade.items);
  }
  return res;
}

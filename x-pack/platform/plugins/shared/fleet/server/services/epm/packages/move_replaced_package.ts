/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: move a replaced package's integration policies to its replacement.
//
// A package version whose manifest says `deprecated.replaced_by.package: <replacement>` (e.g.
// nginx_otel_input and nginx_otel_integration -> nginx_otel, package structure design) is moved:
//   1. install the replacement (latest version), with the replaced package's "Install content"
//      choice when it isn't installed yet
//   2. for each integration policy of the replaced package, create a policy of the replacement on
//      the same agent policies, with the same name, namespace and settings (mapped below)
//   3. only then delete the old policy, so an agent policy never loses data collection it had
//   4. record what happened on both installations; the UI shows it ("X now lives in Y")
// A policy that can't be mapped without dropping an enabled stream stays where it is, and is
// reported. The replaced package stays installed: it shares index templates with the replacement
// (same data streams), so uninstalling it would remove assets the replacement uses.
//
// Mapping rules (no per-package code):
// - Streams pair by input type + data stream type + dataset. For input packages the dataset and
//   type come from the `data_stream.dataset` / `data_stream.type` settings (what the agent writes
//   to), else from the stream's data stream. Enabled state is copied; replacement streams with no
//   counterpart are off, so nothing new starts collecting.
// - Settings (vars) map by name: stream -> the paired stream, then its input, then package level.
//   Input settings -> the paired input, then package level. Package settings -> package level.
//   Settings with a value and no same-name setting are reported as unmapped.

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import semverLt from 'semver/functions/lt';

import {
  DATASET_VAR_NAME,
  DATA_STREAM_TYPE_VAR_NAME,
  USE_APM_VAR_NAME,
} from '../../../../common/constants';
import { packageToPackagePolicy } from '../../../../common/services';
import type {
  Installation,
  NewPackagePolicy,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  PackageInfo,
  PackagePolicy,
  PackagePolicyConfigRecord,
  ReplacedPackageMove,
} from '../../../../common/types';
import { PACKAGES_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../constants';
import { FleetError } from '../../../errors';
import { appContextService } from '../../app_context';
import { packagePolicyService, getPackagePolicySavedObjectType } from '../../package_policy';
import * as Registry from '../registry';

import { getInstallationObject, getPackageInfo } from './get';
import { installPackage } from './install';

/** The package that replaces this one, from `deprecated.replaced_by.package`. */
export const getReplacementPackageName = (pkg: Pick<PackageInfo, 'deprecated'>) =>
  pkg.deprecated?.replaced_by?.package;

// Routing settings of input packages: they decide the target data stream, which is matched, not copied.
const ROUTING_VARS = new Set([DATASET_VAR_NAME, DATA_STREAM_TYPE_VAR_NAME, USE_APM_VAR_NAME]);

const hasValue = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  value !== '' &&
  !(Array.isArray(value) && value.length === 0);

/** Dataset and type a stream writes to. Input packages route with settings. */
const getStreamTarget = (stream: NewPackagePolicyInputStream, isInputPackage: boolean) => {
  const datasetVar = stream.vars?.[DATASET_VAR_NAME]?.value;
  const typeVar = stream.vars?.[DATA_STREAM_TYPE_VAR_NAME]?.value;
  const dataset =
    isInputPackage && datasetVar
      ? typeof datasetVar === 'string'
        ? datasetVar
        : (datasetVar as { dataset?: string }).dataset
      : undefined;
  return {
    dataset: dataset || stream.data_stream.dataset,
    type: (isInputPackage && typeof typeVar === 'string' && typeVar) || stream.data_stream.type,
  };
};

/** Copies vars by name into the first target record that has them; returns the names left over. */
const copyVars = (
  from: PackagePolicyConfigRecord | undefined,
  targets: Array<PackagePolicyConfigRecord | undefined>
): string[] => {
  const unmapped: string[] = [];
  Object.entries(from ?? {}).forEach(([name, entry]) => {
    if (ROUTING_VARS.has(name)) return;
    const target = targets.find((vars) => vars && name in vars);
    if (target) {
      target[name] = { ...target[name], value: entry.value };
    } else if (hasValue(entry.value)) {
      unmapped.push(name);
    }
  });
  return unmapped;
};

export type ReplacementPolicyMapping =
  | { policy: NewPackagePolicy; unmappedVars: string[] }
  | { error: string };

/**
 * Builds a policy of `newPkg` equivalent to `oldPolicy` (a policy of `oldPkg`), with the rules in
 * the file header. Pure: no saved objects are read or written.
 */
export const mapPackagePolicyToReplacement = (
  oldPolicy: PackagePolicy,
  oldPkg: Pick<PackageInfo, 'type' | 'title'>,
  newPkg: PackageInfo
): ReplacementPolicyMapping => {
  const policy = packageToPackagePolicy(
    newPkg,
    oldPolicy.policy_ids,
    oldPolicy.namespace ?? '',
    oldPolicy.name,
    oldPolicy.description
  );
  if (oldPolicy.output_id) policy.output_id = oldPolicy.output_id;
  // Nothing collects unless an old stream says so.
  policy.inputs.forEach((input) => {
    input.enabled = false;
    input.streams.forEach((stream) => (stream.enabled = false));
  });

  const isInputPackage = oldPkg.type === 'input';
  const unmappedVars: string[] = [];

  for (const oldInput of oldPolicy.inputs) {
    const candidates = policy.inputs.filter((input) => input.type === oldInput.type);
    let pairedInput: NewPackagePolicyInput | undefined;

    for (const oldStream of oldInput.streams) {
      const target = getStreamTarget(oldStream, isInputPackage);
      const pair = candidates
        .flatMap((input) => input.streams.map((stream) => ({ input, stream })))
        .find(
          ({ stream }) =>
            stream.data_stream.dataset === target.dataset && stream.data_stream.type === target.type
        );
      const streamEnabled = oldInput.enabled && oldStream.enabled;
      if (!pair) {
        if (streamEnabled) {
          return {
            error: `${newPkg.title} has no ${oldInput.type} stream for ${target.type}-${target.dataset}`,
          };
        }
        continue;
      }
      pairedInput = pair.input;
      pair.stream.enabled = streamEnabled;
      pair.input.enabled = pair.input.enabled || streamEnabled;
      unmappedVars.push(
        ...copyVars(oldStream.vars, [pair.stream.vars, pair.input.vars, policy.vars]).map(
          (name) => `${target.dataset}: ${name}`
        )
      );
    }

    const inputTarget = pairedInput ?? candidates[0];
    unmappedVars.push(
      ...copyVars(oldInput.vars, [inputTarget?.vars, policy.vars]).map(
        (name) => `${oldInput.type} input: ${name}`
      )
    );
  }
  unmappedVars.push(...copyVars(oldPolicy.vars, [policy.vars]).map((name) => `package: ${name}`));

  return { policy, unmappedVars };
};

/** Installs the replacement's latest version unless it's already installed at that version. */
const ensureReplacementInstalled = async ({
  replacement,
  replaced,
  esClient,
}: {
  replacement: string;
  replaced: Installation;
  esClient: ElasticsearchClient;
}) => {
  const savedObjectsClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const latest = await Registry.fetchFindLatestPackageOrThrow(replacement, { prerelease: true });
  const installed = await getInstallationObject({ savedObjectsClient, pkgName: replacement });
  if (
    installed?.attributes.install_status === 'installed' &&
    !semverLt(installed.attributes.version, latest.version)
  ) {
    return installed.attributes.version;
  }
  const result = await installPackage({
    installSource: 'registry',
    savedObjectsClient,
    esClient,
    pkgkey: Registry.pkgToPkgKey(latest),
    spaceId: replaced.installed_kibana_space_id ?? DEFAULT_SPACE_ID,
    force: true,
    // A new installation takes the replaced package's "Install content" choice.
    skipKibanaAssets: installed ? undefined : replaced.skip_kibana_assets,
  });
  if (result.error) {
    throw new FleetError(`Could not install ${replacement}: ${result.error.message}`);
  }
  return latest.version;
};

const recordMove = async (move: ReplacedPackageMove, replacement: string, version: string) => {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const target = await getInstallationObject({
    savedObjectsClient: soClient,
    pkgName: replacement,
  });
  await soClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, replacement, {
    moved_from: [
      ...(target?.attributes.moved_from ?? []).filter((m) => m.package !== move.package),
      move,
    ],
  });
  await soClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, move.package, {
    moved_to: { package: replacement, version, moved_at: move.moved_at },
  });
};

/**
 * Moves the integration policies of `pkgName` (installed version) to the package that replaces
 * it. Returns undefined when the installed version isn't replaced.
 */
export async function moveReplacedPackagePolicies({
  pkgName,
  esClient,
  logger,
}: {
  pkgName: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<ReplacedPackageMove | undefined> {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const installation = await getInstallationObject({ savedObjectsClient: soClient, pkgName });
  if (!installation) return undefined;
  const oldPkg = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgName,
    pkgVersion: installation.attributes.version,
    prerelease: true,
  });
  const replacement = getReplacementPackageName(oldPkg);
  if (!replacement) return undefined;

  logger.info(`Moving integration policies of ${pkgName} to its replacement ${replacement}`);
  const replacementVersion = await ensureReplacementInstalled({
    replacement,
    replaced: installation.attributes,
    esClient,
  });
  const newPkg = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgName: replacement,
    pkgVersion: replacementVersion,
    prerelease: true,
  });

  const savedObjectType = await getPackagePolicySavedObjectType();
  const { items: oldPolicies } = await packagePolicyService.list(soClient, {
    page: 1,
    perPage: SO_SEARCH_LIMIT,
    kuery: `${savedObjectType}.package.name:${pkgName}`,
    spaceId: '*',
  });

  const move: ReplacedPackageMove = {
    package: pkgName,
    title: oldPkg.title,
    version: oldPkg.version,
    moved_at: new Date().toISOString(),
    package_policies: [],
    not_moved: [],
  };

  for (const oldPolicy of oldPolicies) {
    const mapping = mapPackagePolicyToReplacement(oldPolicy, oldPkg, newPkg);
    if ('error' in mapping) {
      move.not_moved.push({ id: oldPolicy.id, name: oldPolicy.name, reason: mapping.error });
      continue;
    }
    const spaceId = oldPolicy.spaceIds?.[0] ?? DEFAULT_SPACE_ID;
    const spaceSoClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);
    try {
      // Same name as the old policy: unique again once the old one is deleted below.
      const created = await packagePolicyService.create(spaceSoClient, esClient, mapping.policy, {
        spaceId,
        packageInfo: newPkg,
        skipEnsureInstalled: true,
        skipUniqueNameVerification: true,
        force: true,
      });
      const [deleted] = await packagePolicyService.delete(spaceSoClient, esClient, [oldPolicy.id], {
        force: true,
      });
      if (!deleted?.success) {
        logger.warn(
          `Moved ${oldPolicy.name} to ${replacement} but could not delete the old policy ${oldPolicy.id}: ${deleted?.body?.message}`
        );
      }
      move.package_policies.push({
        name: oldPolicy.name,
        from_id: oldPolicy.id,
        to_id: created.id,
        policy_ids: created.policy_ids,
        unmapped_vars: mapping.unmappedVars,
      });
    } catch (error) {
      move.not_moved.push({ id: oldPolicy.id, name: oldPolicy.name, reason: error.message });
    }
  }

  await recordMove(move, replacement, replacementVersion);
  logger.info(
    `Moved ${move.package_policies.length} integration policies of ${pkgName} to ${replacement}, ${move.not_moved.length} not moved`
  );
  return move;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { RequestHandler, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { groupBy, isEmpty, isEqual, keyBy, uniq } from 'lodash';

import { populatePackagePolicyAssignedAgentsCount } from '../../services/package_policies/populate_package_policy_assigned_agents_count';

import {
  agentPolicyService,
  appContextService,
  checkAllowedPackages,
  packagePolicyService,
} from '../../services';
import type {
  BulkGetPackagePoliciesRequestSchema,
  CreatePackagePolicyRequestSchema,
  DeleteOnePackagePolicyRequestSchema,
  DeletePackagePoliciesRequestSchema,
  DryRunPackagePoliciesRequestSchema,
  FleetRequestHandler,
  GetOnePackagePolicyRequestSchema,
  GetPackagePoliciesRequestSchema,
  PackagePolicy,
  UpdatePackagePolicyRequestBodySchema,
  UpdatePackagePolicyRequestSchema,
  UpgradePackagePoliciesRequestSchema,
} from '../../types';
import type {
  NewPackagePolicy,
  PostDeletePackagePoliciesResponse,
  UpgradePackagePolicyDryRunResponse,
  UpgradePackagePolicyResponse,
} from '../../../common/types';
import { isOnlyAgentlessIntegration } from '../../../common/services/agentless_policy_helper';
import { logLegacyAgentlessWriteDeprecation } from '../../services/utils/agentless';
import { inputsFormat, installationStatuses } from '../../../common/constants';
import {
  CustomPackagePolicyNotAllowedForAgentlessError,
  FleetError,
  PackagePolicyNotFoundError,
  PackagePolicyRequestError,
} from '../../errors';
import {
  getInstallation,
  getInstallations,
  getPackageInfo,
  removeInstallation,
} from '../../services/epm/packages';
import { PACKAGES_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../constants';
import type { SimplifiedPackagePolicy } from '../../../common/services/simplified_package_policy_helper';
import {
  packagePolicyToSimplifiedPackagePolicy,
  simplifiedPackagePolicytoNewPackagePolicy,
} from '../../../common/services/simplified_package_policy_helper';
import { runWithCache } from '../../services/epm/packages/cache';

import {
  alignInputsAndStreams,
  getAgentlessAgentPolicyIds,
  haveAgentlessAgentPolicies,
  isSimplifiedCreatePackagePolicyRequest,
  removeFieldsFromInputSchema,
  renameAgentlessAgentPolicy,
} from './utils';

export const isNotNull = <T>(value: T | null): value is T => value !== null;

const deduplicateIds = (ids: string[]) => uniq(ids);

export const getPackagePoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetPackagePoliciesRequestSchema.query>
> = async (context, request, response) => {
  const esClient = (await context.core).elasticsearch.client.asInternalUser;
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const limitedToPackages = fleetContext.limitedToPackages;

  const { items, total, page, perPage } = await packagePolicyService.list(soClient, request.query);

  checkAllowedPackages(items, limitedToPackages, 'package.name');

  if (request.query.withAgentCount) {
    await populatePackagePolicyAssignedAgentsCount(esClient, items);
  }

  // agnostic to package-level RBAC
  return response.ok({
    body: {
      items:
        request.query.format === inputsFormat.Simplified
          ? items.map((item) => packagePolicyToSimplifiedPackagePolicy(item))
          : items,
      total,
      page,
      perPage,
    },
  });
};

export const bulkGetPackagePoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof BulkGetPackagePoliciesRequestSchema.query>,
  TypeOf<typeof BulkGetPackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const limitedToPackages = fleetContext.limitedToPackages;
  const ignoreMissing = request.body.ignoreMissing;
  const ids = deduplicateIds(request.body.ids);

  try {
    const items = await packagePolicyService.getByIDs(soClient, ids, {
      ignoreMissing,
    });
    const responseItems = items ?? [];

    checkAllowedPackages(responseItems, limitedToPackages, 'package.name');

    return response.ok({
      body: {
        items:
          responseItems.length > 0 && request.query.format === inputsFormat.Simplified
            ? responseItems.map((item) => packagePolicyToSimplifiedPackagePolicy(item))
            : responseItems,
      },
    });
  } catch (error) {
    if (error instanceof PackagePolicyNotFoundError) {
      return response.notFound({
        body: { message: error.message },
      });
    }

    throw error;
  }
};

export const getOnePackagePolicyHandler: FleetRequestHandler<
  TypeOf<typeof GetOnePackagePolicyRequestSchema.params>,
  TypeOf<typeof GetOnePackagePolicyRequestSchema.query>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const limitedToPackages = fleetContext.limitedToPackages;
  const { packagePolicyId } = request.params;
  const notFoundResponse = () =>
    response.notFound({ body: { message: `Package policy ${packagePolicyId} not found` } });

  try {
    const packagePolicy = await packagePolicyService.get(soClient, packagePolicyId);

    if (packagePolicy) {
      checkAllowedPackages([packagePolicy], limitedToPackages, 'package.name');

      return response.ok({
        body: {
          item:
            request.query.format === inputsFormat.Simplified
              ? packagePolicyToSimplifiedPackagePolicy(packagePolicy)
              : packagePolicy,
        },
      });
    } else {
      return notFoundResponse();
    }
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return notFoundResponse();
    }
    throw error;
  }
};

export const getOrphanedPackagePolicies: RequestHandler<undefined, undefined> = async (
  context,
  request,
  response
) => {
  const soClient = (await context.core).savedObjects.client;

  const installedPackages = await getInstallations(soClient, {
    perPage: SO_SEARCH_LIMIT,
    filter: `
        ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:${installationStatuses.Installed}
    `,
  });
  const orphanedPackagePolicies: PackagePolicy[] = [];
  const packagePolicies = await packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });
  const packagePoliciesByPackage = groupBy(packagePolicies.items, 'package.name');
  const agentPolicies = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });
  const agentPoliciesById = keyBy(agentPolicies.items, 'id');
  const usedPackages = installedPackages.saved_objects.filter(
    ({ attributes: { name } }) => !!packagePoliciesByPackage[name]
  );
  usedPackages.forEach(({ attributes: { name } }) => {
    packagePoliciesByPackage[name].forEach((packagePolicy) => {
      if (packagePolicy.policy_ids.every((policyId) => !agentPoliciesById[policyId])) {
        orphanedPackagePolicies.push(packagePolicy);
      }
    });
  });

  return response.ok({
    body: {
      items: orphanedPackagePolicies,
      total: orphanedPackagePolicies.length,
    },
  });
};

export const createPackagePolicyHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof CreatePackagePolicyRequestSchema.query>,
  TypeOf<typeof CreatePackagePolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const { force, id, package: pkg, create_dataset_templates, ...newPolicy } = request.body;
  if ('spaceIds' in newPolicy) {
    delete newPolicy.spaceIds;
  }

  let wasPackageAlreadyInstalled = false;

  const spaceId = fleetContext.spaceId;

  // These checks run before the try block on purpose: its catch treats errors as
  // creation failures (error log + package installation rollback), which must not
  // run for these pure validation rejections.
  const legacyAgentlessApiDisabled =
    appContextService.getExperimentalFeatures().disableAgentlessLegacyAPI;

  // The cheap `supports_agentless` detection runs regardless of the flag so legacy
  // agentless usage is measurable (deprecation warn) before the flag is flipped
  // fleet-wide — the flip is what starts rejecting these callers.
  if (request.body.supports_agentless) {
    if (legacyAgentlessApiDisabled) {
      throw new FleetError('To create managed integrations, use the managed integrations API.');
    }
    logLegacyAgentlessWriteDeprecation('create package policy');
  }

  // The remaining detections need extra SO/registry lookups, so they stay
  // flag-gated to avoid adding cost to normal (flag-off) traffic.
  if (legacyAgentlessApiDisabled) {
    if (pkg) {
      // skipArchive: only deployment_modes is needed here, avoid the archive download.
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
        ignoreUnverified: force,
        prerelease: true,
        skipArchive: true,
      });
      if (isOnlyAgentlessIntegration(pkgInfo)) {
        throw new FleetError(
          `Package ${pkg.name} can only be used as a managed integration. To create managed integrations, use the managed integrations API.`
        );
      }
    }
    const parentPolicyIds = [
      ...(newPolicy.policy_ids ?? []),
      ...(newPolicy.policy_id ? [newPolicy.policy_id] : []),
    ];
    if (await haveAgentlessAgentPolicies(soClient, parentPolicyIds)) {
      throw new FleetError(
        'To add integrations to a managed integration, use the managed integrations API.'
      );
    }
  }

  try {
    let newPackagePolicy: NewPackagePolicy;
    if (isSimplifiedCreatePackagePolicyRequest(newPolicy)) {
      if (!pkg) {
        throw new PackagePolicyRequestError('Package is required');
      }
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
        ignoreUnverified: force,
        prerelease: true,
      });
      newPackagePolicy = simplifiedPackagePolicytoNewPackagePolicy(newPolicy, pkgInfo, {
        experimental_data_stream_features: pkg.experimental_data_stream_features,
      });
    } else {
      newPackagePolicy = await packagePolicyService.enrichPolicyWithDefaultsFromPackage(soClient, {
        ...newPolicy,
        package: pkg,
      } as NewPackagePolicy);
    }
    newPackagePolicy.inputs = alignInputsAndStreams(newPackagePolicy.inputs);

    const installation = await getInstallation({
      savedObjectsClient: soClient,
      pkgName: pkg!.name,
    });

    wasPackageAlreadyInstalled = installation?.install_status === 'installed';

    // Create package policy
    const packagePolicy = await fleetContext.packagePolicyService.asCurrentUser.create(
      soClient,
      esClient,
      newPackagePolicy,
      {
        id,
        force,
        spaceId,
        createDatasetTemplates: create_dataset_templates,
      },
      context,
      request
    );

    return response.ok({
      body: {
        item:
          request.query.format === inputsFormat.Simplified
            ? packagePolicyToSimplifiedPackagePolicy(packagePolicy)
            : packagePolicy,
      },
    });
  } catch (error) {
    appContextService
      .getLogger()
      .error(`Error while creating package policy due to error: ${error.message}`, { error });
    if (!wasPackageAlreadyInstalled) {
      const installation = await getInstallation({
        savedObjectsClient: soClient,
        pkgName: pkg!.name,
      });
      if (installation) {
        appContextService
          .getLogger()
          .info(`rollback ${pkg!.name}-${pkg!.version} package installation after error`);
        await removeInstallation({
          savedObjectsClient: soClient,
          pkgName: pkg!.name,
          pkgVersion: pkg!.version,
          esClient,
        });
      }
    }

    if (error instanceof CustomPackagePolicyNotAllowedForAgentlessError) {
      // Agentless deployments have 1:1 agent to integration policies
      // We delete the associated agent policy previously created.
      const agentPolicyId = newPolicy.policy_ids?.[0];

      if (agentPolicyId) {
        appContextService
          .getLogger()
          .info(
            `Deleting agent policy ${agentPolicyId}, associated with custom integration not allowed for agentless deployment`
          );

        await agentPolicyService.delete(soClient, esClient, agentPolicyId).catch(() => {
          appContextService
            .getLogger()
            .error(
              `Failed to delete agent policy ${agentPolicyId}, associated with custom integration not allowed for agentless deployment`
            );
        });
      }
      throw error;
    }

    if (error.statusCode) {
      return response.customError({
        statusCode: error.statusCode,
        body: { message: error.message },
      });
    }
    throw error;
  }
};

export const updatePackagePolicyHandler: FleetRequestHandler<
  TypeOf<typeof UpdatePackagePolicyRequestSchema.params>,
  TypeOf<typeof UpdatePackagePolicyRequestSchema.query>,
  TypeOf<typeof UpdatePackagePolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const limitedToPackages = fleetContext.limitedToPackages;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const packagePolicy = await packagePolicyService.get(soClient, request.params.packagePolicyId);

  if (!packagePolicy) {
    throw new PackagePolicyNotFoundError('Package policy not found');
  }

  if (limitedToPackages && limitedToPackages.length) {
    const packageName = packagePolicy?.package?.name;
    if (packageName && !limitedToPackages.includes(packageName)) {
      return response.forbidden({
        body: { message: `Update for package name ${packageName} is not authorized.` },
      });
    }
  }

  const legacyAgentlessApiDisabled =
    appContextService.getExperimentalFeatures().disableAgentlessLegacyAPI;

  // The cheap own/body-flag detection runs regardless of the flag so legacy
  // agentless usage is measurable before the flip. The body flag is checked to
  // prevent converting a regular package policy into an agentless one.
  const { packagePolicyId } = request.params;
  const isAgentless = Boolean(packagePolicy.supports_agentless || request.body.supports_agentless);
  if (isAgentless) {
    if (legacyAgentlessApiDisabled) {
      throw new FleetError(
        `To update managed integrations, use the managed integrations API. Offending ID: ${packagePolicyId}.`
      );
    }
    logLegacyAgentlessWriteDeprecation('update package policy');
  }

  // The parent-agent-policy detections need extra SO lookups, so they stay flag-gated to avoid
  // adding cost to normal (flag-off) traffic.
  if (legacyAgentlessApiDisabled) {
    const targetParentPolicyIds = [
      ...(request.body.policy_ids ?? []),
      ...(request.body.policy_id ? [request.body.policy_id] : []),
    ];
    const agentlessTargetIds = await getAgentlessAgentPolicyIds(soClient, targetParentPolicyIds);
    if (agentlessTargetIds.length > 0) {
      throw new FleetError(
        `To add integrations to a managed integration, use the managed integrations API. Offending IDs: ${agentlessTargetIds.join(
          ', '
        )}.`
      );
    }

    if (await haveAgentlessAgentPolicies(soClient, packagePolicy.policy_ids ?? [])) {
      throw new FleetError(
        `To update managed integrations, use the managed integrations API. Offending ID: ${packagePolicyId}.`
      );
    }
  }

  try {
    // simplified request
    const { force, package: pkg, ...body } = request.body;
    let newData: NewPackagePolicy;

    if (
      body.inputs &&
      isSimplifiedCreatePackagePolicyRequest(body as unknown as SimplifiedPackagePolicy)
    ) {
      if (!pkg) {
        throw new PackagePolicyRequestError('Package is required');
      }
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
      });

      newData = simplifiedPackagePolicytoNewPackagePolicy(
        body as unknown as SimplifiedPackagePolicy,
        pkgInfo,
        { experimental_data_stream_features: pkg.experimental_data_stream_features }
      );
    } else {
      // complete request
      const { overrides, ...restOfBody } = body as TypeOf<
        typeof UpdatePackagePolicyRequestBodySchema
      >;
      const packagePolicyInputs = removeFieldsFromInputSchema(packagePolicy.inputs);

      // listing down accepted properties, because loaded packagePolicy contains some that are not accepted in update
      newData = {
        ...restOfBody,
        name: restOfBody.name ?? packagePolicy.name,
        description: restOfBody.description ?? packagePolicy.description,
        namespace: restOfBody.namespace ?? packagePolicy?.namespace,
        policy_id:
          restOfBody.policy_id === undefined ? packagePolicy.policy_id : restOfBody.policy_id,
        enabled:
          'enabled' in restOfBody
            ? restOfBody.enabled ?? packagePolicy.enabled
            : packagePolicy.enabled,
        package: pkg ?? packagePolicy.package,
        inputs: restOfBody.inputs ?? packagePolicyInputs,
        vars: restOfBody.vars ?? packagePolicy.vars,
        var_group_selections: restOfBody.var_group_selections ?? packagePolicy.var_group_selections,
        supports_agentless: restOfBody.supports_agentless ?? packagePolicy.supports_agentless,
        supports_cloud_connector:
          restOfBody.supports_cloud_connector ?? packagePolicy.supports_cloud_connector,
        cloud_connector_id: restOfBody.cloud_connector_id ?? packagePolicy.cloud_connector_id,
      } as NewPackagePolicy;

      if (overrides) {
        newData.overrides = overrides;
      }
    }

    newData.inputs = alignInputsAndStreams(newData.inputs);

    if (
      newData.policy_ids &&
      !isEmpty(packagePolicy.policy_ids) &&
      !isEqual(newData.policy_ids, packagePolicy.policy_ids)
    ) {
      const agentPolicy = await agentPolicyService.get(soClient, packagePolicy.policy_ids[0]);
      if (agentPolicy?.supports_agentless) {
        throw new PackagePolicyRequestError(
          'Cannot change agent policies of an agentless integration'
        );
      }
    }

    if (
      newData.output_id !== undefined &&
      newData.output_id !== packagePolicy.output_id &&
      !isEmpty(packagePolicy.policy_ids)
    ) {
      const parentAgentPolicies = await agentPolicyService.getByIds(
        soClient,
        packagePolicy.policy_ids!,
        { ignoreMissing: true }
      );
      if (parentAgentPolicies.some((ap) => ap.is_managed)) {
        throw new PackagePolicyRequestError(
          'Cannot change the output of a package policy belonging to a managed agent policy'
        );
      }
    }

    await renameAgentlessAgentPolicy(soClient, esClient, packagePolicy, newData.name);

    const updatedPackagePolicy = await packagePolicyService.update(
      soClient,
      esClient,
      request.params.packagePolicyId,
      newData,
      { user, force },
      packagePolicy.package?.version
    );
    return response.ok({
      body: {
        item:
          request.query.format === inputsFormat.Simplified
            ? packagePolicyToSimplifiedPackagePolicy(updatedPackagePolicy)
            : updatedPackagePolicy,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return response.customError({
        statusCode: error.statusCode,
        body: { message: error.message },
      });
    }
    throw error;
  }
};

export const deletePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeletePackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const packagePolicyIds = deduplicateIds(request.body.packagePolicyIds);

  const body: PostDeletePackagePoliciesResponse = await packagePolicyService.delete(
    soClient,
    esClient,
    packagePolicyIds,
    { user, force: request.body.force, skipUnassignFromAgentPolicies: request.body.force },
    context,
    request
  );

  return response.ok({
    body,
  });
};

export const deleteOnePackagePolicyHandler: RequestHandler<
  TypeOf<typeof DeleteOnePackagePolicyRequestSchema.params>,
  TypeOf<typeof DeleteOnePackagePolicyRequestSchema.query>,
  unknown
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;

  const res = await packagePolicyService.delete(
    soClient,
    esClient,
    [request.params.packagePolicyId],
    { user, force: request.query.force, skipUnassignFromAgentPolicies: request.query.force },
    context,
    request
  );

  if (
    res[0] &&
    res[0].success === false &&
    res[0].statusCode !== 404 // ignore 404 to allow that call to be idempotent
  ) {
    return response.customError({
      statusCode: res[0].statusCode ?? 500,
      body: res[0].body,
    });
  }

  return response.ok({
    body: { id: request.params.packagePolicyId },
  });
};

// Missing policies are skipped here (ignoreMissing) so the upgrade/dry-run
// handlers keep reporting them as per-item 404s.
const throwIfTargetsAgentlessPolicies = async (
  soClient: SavedObjectsClientContract,
  packagePolicyIds: string[]
): Promise<void> => {
  if (!appContextService.getExperimentalFeatures().disableAgentlessLegacyAPI) {
    return;
  }
  const packagePolicies =
    (await packagePolicyService.getByIDs(soClient, packagePolicyIds, { ignoreMissing: true })) ??
    [];
  // Older agentless package policies may not carry the flag themselves — check parents too.
  const agentlessParentIds = new Set(
    await getAgentlessAgentPolicyIds(
      soClient,
      packagePolicies.flatMap((packagePolicy) => packagePolicy.policy_ids)
    )
  );
  const offendingIds = packagePolicies
    .filter(
      (packagePolicy) =>
        packagePolicy.supports_agentless ||
        packagePolicy.policy_ids.some((id) => agentlessParentIds.has(id))
    )
    .map(({ id }) => id);
  if (offendingIds.length > 0) {
    // The whole batch is rejected, so name the offenders for self-remediation.
    throw new FleetError(
      `To upgrade managed integrations, use the managed integrations API. Offending IDs: ${offendingIds.join(
        ', '
      )}.`
    );
  }
};

export const upgradePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof UpgradePackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const packagePolicyIds = deduplicateIds(request.body.packagePolicyIds);

  await throwIfTargetsAgentlessPolicies(soClient, packagePolicyIds);

  const body: UpgradePackagePolicyResponse = await packagePolicyService.bulkUpgrade(
    soClient,
    esClient,
    packagePolicyIds,
    { user }
  );

  const firstFatalError = body.find((item) => item.statusCode && item.statusCode !== 200);

  if (firstFatalError) {
    return response.customError({
      statusCode: firstFatalError.statusCode!,
      body: { message: firstFatalError.body!.message },
    });
  }
  return response.ok({
    body,
  });
};

export const dryRunUpgradePackagePolicyHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DryRunPackagePoliciesRequestSchema.body>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;

  const body: UpgradePackagePolicyDryRunResponse = [];
  const packagePolicyIds = deduplicateIds(request.body.packagePolicyIds);

  await throwIfTargetsAgentlessPolicies(soClient, packagePolicyIds);

  await runWithCache(async () => {
    for (const id of packagePolicyIds) {
      const result = await packagePolicyService.getUpgradeDryRunDiff(soClient, id);
      body.push(result);
    }
  });

  const firstFatalError = body.find((item) => item.statusCode && item.statusCode !== 200);

  if (firstFatalError) {
    return response.customError({
      statusCode: firstFatalError.statusCode!,
      body: { message: firstFatalError.body!.message },
    });
  }

  return response.ok({
    body,
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { z } from '@kbn/zod';
import { SUB_ACTION } from './constants';

// Connector schema
export const SentinelOneConfigSchema = z.object({ url: z.string() });
export const SentinelOneSecretsSchema = z.object({
  token: z.string(),
});

export const SentinelOneApiDoNotValidateResponsesSchema = z.any();

export const SentinelOneBaseApiResponseSchema = z.object({}).passthrough().optional();

export const SentinelOneGetAgentsResponseSchema = z
  .object({
    pagination: z.object({
      totalItems: z.number(),
      nextCursor: z.string().nullable(),
    }),
    errors: z.array(z.string()).nullable(),
    data: z.array(
      z
        .object({
          modelName: z.string(),
          firewallEnabled: z.boolean(),
          totalMemory: z.number(),
          osName: z.string(),
          cloudProviders: z.record(z.string(), z.any()),
          siteName: z.string(),
          cpuId: z.string(),
          isPendingUninstall: z.boolean(),
          isUpToDate: z.boolean(),
          osArch: z.string(),
          accountId: z.string(),
          locationEnabled: z.boolean(),
          consoleMigrationStatus: z.string(),
          scanFinishedAt: z.string().nullable(),
          operationalStateExpiration: z.string().nullable(),
          agentVersion: z.string(),
          isActive: z.boolean(),
          locationType: z.string(),
          activeThreats: z.number(),
          inRemoteShellSession: z.boolean(),
          allowRemoteShell: z.boolean(),
          serialNumber: z.string().nullable(),
          updatedAt: z.string(),
          lastActiveDate: z.string(),
          firstFullModeTime: z.string().nullable(),
          operationalState: z.string(),
          externalId: z.string(),
          mitigationModeSuspicious: z.string(),
          licenseKey: z.string(),
          cpuCount: z.number(),
          mitigationMode: z.string(),
          networkStatus: z.string(),
          installerType: z.string(),
          uuid: z.string(),
          detectionState: z.string().nullable(),
          infected: z.boolean(),
          registeredAt: z.string(),
          lastIpToMgmt: z.string(),
          storageName: z.string().nullable(),
          osUsername: z.string().nullable(),
          groupIp: z.string(),
          createdAt: z.string(),
          remoteProfilingState: z.string(),
          groupUpdatedAt: z.string().nullable(),
          scanAbortedAt: z.string().nullable(),
          isUninstalled: z.boolean(),
          networkQuarantineEnabled: z.boolean(),
          tags: z.object({
            sentinelone: z.array(
              z.object({
                assignedBy: z.string(),
                assignedAt: z.string(),
                assignedById: z.string(),
                key: z.string(),
                value: z.string(),
                id: z.string(),
              })
            ),
          }),
          externalIp: z.string(),
          siteId: z.string(),
          machineType: z.string(),
          domain: z.string(),
          scanStatus: z.string(),
          osStartTime: z.string(),
          accountName: z.string(),
          lastLoggedInUserName: z.string(),
          showAlertIcon: z.boolean(),
          rangerStatus: z.string(),
          groupName: z.string(),
          threatRebootRequired: z.boolean(),
          remoteProfilingStateExpiration: z.string().nullable(),
          policyUpdatedAt: z.string().nullable(),
          activeDirectory: z
            .object({
              userPrincipalName: z.string().nullable(),
              lastUserDistinguishedName: z.string().nullable(),
              computerMemberOf: z.array(z.object({ type: z.string() }).passthrough()),
              lastUserMemberOf: z.array(z.object({ type: z.string() }).passthrough()),
              mail: z.string().nullable(),
              computerDistinguishedName: z.string().nullable(),
            })
            .passthrough(),
          isDecommissioned: z.boolean(),
          rangerVersion: z.string(),
          userActionsNeeded: z.array(
            z
              .object({
                type: z.string(),
                example: z.string(),
                enum: z.array(z.string()),
              })
              .passthrough()
          ),
          locations: z
            .array(z.object({ name: z.string(), scope: z.string(), id: z.string() }).passthrough())
            .nullable(),
          id: z.string(),
          coreCount: z.number(),
          osRevision: z.string(),
          osType: z.string(),
          groupId: z.string(),
          computerName: z.string(),
          scanStartedAt: z.string(),
          encryptedApplications: z.boolean(),
          storageType: z.string().nullable(),
          networkInterfaces: z.array(
            z
              .object({
                gatewayMacAddress: z.string().nullable(),
                inet6: z.array(z.string()),
                name: z.string(),
                inet: z.array(z.string()),
                physical: z.string(),
                gatewayIp: z.string().nullable(),
                id: z.string(),
              })
              .passthrough()
          ),
          fullDiskScanLastUpdatedAt: z.string(),
          appsVulnerabilityStatus: z.string(),
        })
        .passthrough()
    ),
  })
  .passthrough();

export const SentinelOneIsolateHostResponseSchema = z.object({
  errors: z.array(z.string()).nullable(),
  data: z.object({ affected: z.number() }).passthrough(),
});

export const SentinelOneGetRemoteScriptsParamsSchema = z.object({
  query: z.string().nullable(),
  // Possible values (multiples comma delimiter): `linux` or `macos` or `windows`
  osTypes: z.string().nullable(),
  // possible values (multiples comma delimiter): `action` or `artifactCollection` or `dataCollection`
  scriptType: z.string().nullable(),
  // Cursor position returned by the last request. Use to iterate over more than 1000 items. Example: "YWdlbnRfaWQ6NTgwMjkzODE=".
  cursor: z.string().nullable(),
  // List of group IDs to filter by. Example: "225494730938493804,225494730938493915".
  groupIds: z.string().nullable(),
  // A list of script IDs. Example: "225494730938493804,225494730938493915".
  ids: z.string().nullable(),
  // Is the script runnable in Advanced Response Scripts
  isAvailableForArs: z.boolean().nullable(),
  // Limit number of returned items (1-1000). Example: "10".
  limit: z.number().max(1000).min(1).default(10).nullable(),
  // List of Site IDs to filter by. Example: "225494730938493804,225494730938493915".
  siteIds: z.string().nullable(),
  // Skip first number of items (0-1000). To iterate over more than 1000 items, use "cursor". Example: "150".
  skip: z.number().nullable(),
  // If true, total number of items will not be calculated, which speeds up execution time.
  skipCount: z.boolean().nullable(),
  // The column to sort the results by. Example: "id".
  sortBy: z.string().nullable(),
  // Sort direction. Example: "asc" or "desc"
  sortOrder: z.string().nullable(),
});

export const SentinelOneFetchAgentFilesParamsSchema = z.object({
  agentId: z.string().min(1),
  zipPassCode: z.string().min(10),
  files: z.array(z.string().min(1)),
});

export const SentinelOneFetchAgentFilesResponseSchema = z
  .object({
    errors: z.array(z.string()).nullable(),
    data: z
      .object({
        success: z.boolean(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const SentinelOneDownloadAgentFileParamsSchema = z.object({
  agentId: z.string().min(1),
  activityId: z.string().min(1),
});

export const SentinelOneDownloadAgentFileResponseSchema = z.any();

export const SentinelOneGetActivitiesParamsSchema = z
  .object({
    accountIds: z.string().min(1).optional(),
    activityTypes: z.string().optional(),
    activityUuids: z.string().min(1).optional(),
    agentIds: z.string().min(1).optional(),
    alertIds: z.string().min(1).optional(),
    countOnly: z.boolean().optional(),
    createdAt__between: z.string().min(1).optional(),
    createdAt__gt: z.string().min(1).optional(),
    createdAt__gte: z.string().min(1).optional(),
    createdAt__lt: z.string().min(1).optional(),
    createdAt__lte: z.string().min(1).optional(),
    cursor: z.string().min(1).optional(),
    groupIds: z.string().min(1).optional(),
    ids: z.string().min(1).optional(),
    includeHidden: z.boolean().optional(),
    limit: z.number().optional(),
    ruleIds: z.string().min(1).optional(),
    siteIds: z.string().min(1).optional(),
    skip: z.number().optional(),
    skipCount: z.boolean().optional(),
    sortBy: z.string().min(1).optional(),
    sortOrder: z.string().min(1).optional(),
    threatIds: z.string().min(1).optional(),
    userEmails: z.string().min(1).optional(),
    userIds: z.string().min(1).optional(),
  })
  .optional();

export const SentinelOneGetActivitiesResponseSchema = z
  .object({
    errors: z.array(z.string()).optional(),
    pagination: z.object({
      nextCursor: z.string().nullable(),
      totalItems: z.number(),
    }),
    data: z.array(
      z
        .object({
          accountId: z.string(),
          accountName: z.string(),
          activityType: z.number(),
          activityUuid: z.string(),
          agentId: z.string().nullable(),
          agentUpdatedVersion: z.string().nullable(),
          comments: z.string().nullable(),
          createdAt: z.string(),
          data: z
            .object({
              // Empty by design.
              // The SentinelOne Activity Log can place any (unknown) data here
            })
            .passthrough(),
          description: z.string().nullable(),
          groupId: z.string().nullable(),
          groupName: z.string().nullable(),
          hash: z.string().nullable(),
          id: z.string(),
          osFamily: z.string().nullable(),
          primaryDescription: z.string().nullable(),
          secondaryDescription: z.string().nullable(),
          siteId: z.string(),
          siteName: z.string(),
          threatId: z.string().nullable(),
          updatedAt: z.string(),
          userId: z.string().nullable(),
        })
        .passthrough()
    ),
  })
  .passthrough();

export const AlertIds = z.array(z.string()).optional();

export const SentinelOneGetRemoteScriptsResponseSchema = z
  .object({
    errors: z.array(z.string()).nullable(),
    pagination: z.object({
      nextCursor: z.string().nullable(),
      totalItems: z.number(),
    }),
    data: z.array(
      z
        .object({
          id: z.string(),
          updater: z.string().nullable(),
          isAvailableForLite: z.boolean(),
          isAvailableForArs: z.boolean(),
          fileSize: z.number(),
          mgmtId: z.number(),
          scopeLevel: z.string(),
          shortFileName: z.string(),
          scriptName: z.string(),
          creator: z.string(),
          package: z
            .object({
              id: z.string(),
              bucketName: z.string(),
              endpointExpiration: z.string(),
              fileName: z.string(),
              endpointExpirationSeconds: z.number().nullable(),
              fileSize: z.number(),
              signatureType: z.string(),
              signature: z.string(),
            })
            .passthrough()
            .nullable(),
          bucketName: z.string(),
          inputRequired: z.boolean(),
          fileName: z.string(),
          supportedDestinations: z.array(z.string()).nullable(),
          scopeName: z.string().nullable(),
          signatureType: z.string(),
          outputFilePaths: z.array(z.string()).nullable(),
          scriptDescription: z.string().nullable(),
          createdByUserId: z.string(),
          scopeId: z.string(),
          updatedAt: z.string(),
          scriptType: z.string(),
          scopePath: z.string(),
          creatorId: z.string(),
          osTypes: z.array(z.string()),
          scriptRuntimeTimeoutSeconds: z.number(),
          version: z.string(),
          updaterId: z.string().nullable(),
          createdAt: z.string(),
          inputExample: z.string().nullable(),
          inputInstructions: z.string().nullable(),
          signature: z.string(),
          createdByUser: z.string(),
          requiresApproval: z.boolean().optional(),
        })
        .passthrough()
    ),
  })
  .passthrough();

export const SentinelOneExecuteScriptParamsSchema = z.object({
  // Only a sub-set of filters are defined below. This API, however, support many more filters
  // which can be added in the future if needed.
  filter: z.object({
    uuids: z.string().min(1).optional(),
    ids: z.string().min(1).optional(),
  }),
  script: z.object({
    apiKey: z.string().optional(),
    inputParams: z.string().optional(),
    outputDirectory: z.string().optional(),
    outputDestination: z.enum(['Local', 'None', 'SentinelCloud', 'SingularityXDR']).optional(),
    passwordFromScope: z
      .object({
        scopeLevel: z.string().optional(),
        scopeId: z.string().optional(),
      })
      .optional(),
    password: z.string().optional(),
    requiresApproval: z.boolean().optional(),
    scriptId: z.string(),
    scriptName: z.string().optional(),
    scriptRuntimeTimeoutSeconds: z.number().optional(),
    singularityxdrKeyword: z.string().optional(),
    singularityxdrUrl: z.string().optional(),
    taskDescription: z.string().optional(),
  }),
  alertIds: AlertIds,
});

export const SentinelOneExecuteScriptResponseSchema = z
  .object({
    errors: z.array(z.object({}).passthrough()).nullable(),
    data: z
      .object({
        pendingExecutionId: z.string().nullable(),
        affected: z.number().nullable(),
        parentTaskId: z.string().nullable(),
        pending: z.boolean().nullable(),
      })
      .passthrough()
      .nullable(),
  })
  .passthrough();

export const SentinelOneGetRemoteScriptResultsParamsSchema = z.object({
  taskIds: z.array(z.string()),
});

export const SentinelOneGetRemoteScriptResultsResponseSchema = z
  .object({
    errors: z.array(z.object({ type: z.string() }).passthrough()).nullable(),
    data: z.any(),
  })
  .passthrough();

export const SentinelOneDownloadRemoteScriptResultsParamsSchema = z.object({
  taskId: z.string().min(1),
});

export const SentinelOneDownloadRemoteScriptResultsResponseSchema = z.any();

export const SentinelOneGetRemoteScriptStatusParamsSchema = z
  .object({
    parentTaskId: z.string(),
  })
  .passthrough();

export const SentinelOneGetRemoteScriptStatusResponseSchema = z
  .object({
    pagination: z.object({
      totalItems: z.number(),
      nextCursor: z.string().nullable(),
    }),
    errors: z.array(z.object({ type: z.string() }).passthrough()).nullable(),
    data: z.array(z.map(z.string(), z.any())),
  })
  .passthrough();

export const SentinelOneBaseFilterSchema = z.object({
  K8SNodeName__contains: z.string().nullable(),
  coreCount__lt: z.string().nullable(),
  rangerStatuses: z.string().nullable(),
  adUserQuery__contains: z.string().nullable(),
  rangerVersionsNin: z.string().nullable(),
  rangerStatusesNin: z.string().nullable(),
  coreCount__gte: z.string().nullable(),
  threatCreatedAt__gte: z.string().nullable(),
  decommissionedAt__lte: z.string().nullable(),
  operationalStatesNin: z.string().nullable(),
  appsVulnerabilityStatusesNin: z.string().nullable(),
  mitigationMode: z.string().nullable(),
  createdAt__gte: z.string().nullable(),
  gatewayIp: z.string().nullable(),
  cloudImage__contains: z.string().nullable(),
  registeredAt__between: z.string().nullable(),
  threatMitigationStatus: z.string().nullable(),
  installerTypesNin: z.string().nullable(),
  appsVulnerabilityStatuses: z.string().nullable(),
  threatResolved: z.string().nullable(),
  mitigationModeSuspicious: z.string().nullable(),
  isUpToDate: z.string().nullable(),
  adComputerQuery__contains: z.string().nullable(),
  updatedAt__gte: z.string().nullable(),
  azureResourceGroup__contains: z.string().nullable(),
  scanStatus: z.string().nullable(),
  threatContentHash: z.string().nullable(),
  osTypesNin: z.string().nullable(),
  threatRebootRequired: z.string().nullable(),
  totalMemory__between: z.string().nullable(),
  firewallEnabled: z.string().nullable(),
  gcpServiceAccount__contains: z.string().nullable(),
  updatedAt__gt: z.string().nullable(),
  remoteProfilingStates: z.string().nullable(),
  filteredGroupIds: z.string().nullable(),
  agentVersions: z.string().nullable(),
  activeThreats: z.string().nullable(),
  machineTypesNin: z.string().nullable(),
  lastActiveDate__gt: z.string().nullable(),
  awsSubnetIds__contains: z.string().nullable(),
  installerTypes: z.string().nullable(),
  registeredAt__gte: z.string().nullable(),
  migrationStatus: z.string().nullable(),
  cloudTags__contains: z.string().nullable(),
  totalMemory__gte: z.string().nullable(),
  decommissionedAt__lt: z.string().nullable(),
  threatCreatedAt__lt: z.string().nullable(),
  updatedAt__lte: z.string().nullable(),
  osArch: z.string().nullable(),
  registeredAt__gt: z.string().nullable(),
  registeredAt__lt: z.string().nullable(),
  siteIds: z.string().nullable(),
  networkInterfaceInet__contains: z.string().nullable(),
  groupIds: z.string().nullable(),
  uuids: z.string().nullable(),
  accountIds: z.string().nullable(),
  scanStatusesNin: z.string().nullable(),
  cpuCount__lte: z.string().nullable(),
  locationIds: z.string().nullable(),
  awsSecurityGroups__contains: z.string().nullable(),
  networkStatusesNin: z.string().nullable(),
  activeThreats__gt: z.string().nullable(),
  infected: z.string().nullable(),
  osVersion__contains: z.string().nullable(),
  machineTypes: z.string().nullable(),
  agentPodName__contains: z.string().nullable(),
  computerName__like: z.string().nullable(),
  threatCreatedAt__gt: z.string().nullable(),
  consoleMigrationStatusesNin: z.string().nullable(),
  computerName: z.string().nullable(),
  decommissionedAt__between: z.string().nullable(),
  cloudInstanceId__contains: z.string().nullable(),
  createdAt__lte: z.string().nullable(),
  coreCount__between: z.string().nullable(),
  totalMemory__lte: z.string().nullable(),
  remoteProfilingStatesNin: z.string().nullable(),
  adComputerMember__contains: z.string().nullable(),
  threatCreatedAt__between: z.string().nullable(),
  totalMemory__gt: z.string().nullable(),
  ids: z.string().nullable(),
  agentVersionsNin: z.string().nullable(),
  updatedAt__between: z.string().nullable(),
  locationEnabled: z.string().nullable(),
  locationIdsNin: z.string().nullable(),
  osTypes: z.string().nullable(),
  encryptedApplications: z.string().nullable(),
  filterId: z.string().nullable(),
  decommissionedAt__gt: z.string().nullable(),
  adUserMember__contains: z.string().nullable(),
  uuid: z.string().nullable(),
  coreCount__lte: z.string().nullable(),
  coreCount__gt: z.string().nullable(),
  cloudNetwork__contains: z.string().nullable(),
  clusterName__contains: z.string().nullable(),
  cpuCount__gte: z.string().nullable(),
  query: z.string().nullable(),
  lastActiveDate__between: z.string().nullable(),
  rangerStatus: z.string().nullable(),
  domains: z.string().nullable(),
  cloudProvider: z.string().nullable(),
  lastActiveDate__lt: z.string().nullable(),
  scanStatuses: z.string().nullable(),
  hasLocalConfiguration: z.string().nullable(),
  networkStatuses: z.string().nullable(),
  isPendingUninstall: z.string().nullable(),
  createdAt__gt: z.string().nullable(),
  cpuCount__lt: z.string().nullable(),
  consoleMigrationStatuses: z.string().nullable(),
  adQuery: z.string().nullable(),
  updatedAt__lt: z.string().nullable(),
  createdAt__lt: z.string().nullable(),
  adComputerName__contains: z.string().nullable(),
  cloudInstanceSize__contains: z.string().nullable(),
  registeredAt__lte: z.string().nullable(),
  networkQuarantineEnabled: z.string().nullable(),
  cloudAccount__contains: z.string().nullable(),
  cloudLocation__contains: z.string().nullable(),
  rangerVersions: z.string().nullable(),
  networkInterfaceGatewayMacAddress__contains: z.string().nullable(),
  uuid__contains: z.string().nullable(),
  agentNamespace__contains: z.string().nullable(),
  K8SNodeLabels__contains: z.string().nullable(),
  adQuery__contains: z.string().nullable(),
  K8SType__contains: z.string().nullable(),
  countsFor: z.string().nullable(),
  totalMemory__lt: z.string().nullable(),
  externalId__contains: z.string().nullable(),
  filteredSiteIds: z.string().nullable(),
  decommissionedAt__gte: z.string().nullable(),
  cpuCount__gt: z.string().nullable(),
  threatHidden: z.string().nullable(),
  isUninstalled: z.string().nullable(),
  computerName__contains: z.string().nullable(),
  lastActiveDate__lte: z.string().nullable(),
  adUserName__contains: z.string().nullable(),
  isActive: z.string().nullable(),
  userActionsNeeded: z.string().nullable(),
  threatCreatedAt__lte: z.string().nullable(),
  domainsNin: z.string().nullable(),
  operationalStates: z.string().nullable(),
  externalIp__contains: z.string().nullable(),
  isDecommissioned: z.string().nullable(),
  networkInterfacePhysical__contains: z.string().nullable(),
  lastActiveDate__gte: z.string().nullable(),
  createdAt__between: z.string().nullable(),
  cpuCount__between: z.string().nullable(),
  lastLoggedInUserName__contains: z.string().nullable(),
  awsRole__contains: z.string().nullable(),
  K8SVersion__contains: z.string().nullable(),
  alertIds: AlertIds,
});

export const SentinelOneIsolateHostParamsSchema = SentinelOneBaseFilterSchema;

export const SentinelOneGetAgentsParamsSchema = SentinelOneBaseFilterSchema;

export const SentinelOneIsolateHostSchema = z.object({
  subAction: z.literal(SUB_ACTION.ISOLATE_HOST),
  subActionParams: SentinelOneIsolateHostParamsSchema,
});

export const SentinelOneReleaseHostSchema = z.object({
  subAction: z.literal(SUB_ACTION.RELEASE_HOST),
  subActionParams: SentinelOneIsolateHostParamsSchema,
});

export const SentinelOneExecuteScriptSchema = z.object({
  subAction: z.literal(SUB_ACTION.EXECUTE_SCRIPT),
  subActionParams: SentinelOneExecuteScriptParamsSchema,
});

export const SentinelOneActionParamsSchema = z.union([
  SentinelOneIsolateHostSchema,
  SentinelOneReleaseHostSchema,
  SentinelOneExecuteScriptSchema,
]);

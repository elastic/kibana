/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EPM_API_ROOT,
  EPM_API_ROUTES,
  PACKAGE_POLICY_API_ROUTES,
  AGENT_POLICY_API_ROUTES,
  DATA_STREAM_API_ROUTES,
  AGENTS_SETUP_API_ROUTES,
  AGENT_API_ROUTES,
  ENROLLMENT_API_KEY_ROUTES,
  SETUP_API_ROUTE,
  OUTPUT_API_ROUTES,
  SETTINGS_API_ROUTES,
  APP_API_ROUTES,
  K8S_API_ROUTES,
  PRECONFIGURATION_API_ROUTES,
  DOWNLOAD_SOURCE_API_ROUTES,
  FLEET_SERVER_HOST_API_ROUTES,
  FLEET_PROXY_API_ROUTES,
  UNINSTALL_TOKEN_ROUTES,
  FLEET_DEBUG_ROUTES,
  REMOTE_SYNCED_INTEGRATIONS_API_ROUTES,
  MANAGED_INTEGRATIONS_ROUTES,
} from '../constants';

// Encodes a value interpolated into a URL path segment so it cannot alter the route.
// `.` and `..` segments are normalized by browsers even when percent-encoded, so dots are double-encoded.
const encodePathParam = (value: string): string => {
  const encoded = encodeURIComponent(value);
  return /^\.{1,2}$/.test(encoded) ? encoded.replace(/\./g, '%252E') : encoded;
};

// Fills `{name}` placeholders in a route pattern with URL-encoded values.
export const buildPath = (pattern: string, params: Record<string, string>): string =>
  Object.entries(params).reduce(
    (path, [name, value]) => path.replace(`{${name}}`, encodePathParam(value)),
    pattern
  );

export const epmRouteService = {
  getVerificationKeyIdPath: () => {
    return EPM_API_ROUTES.VERIFICATION_KEY_ID;
  },

  getCategoriesPath: () => {
    return EPM_API_ROUTES.CATEGORIES_PATTERN;
  },

  getListPath: () => {
    return EPM_API_ROUTES.LIST_PATTERN;
  },

  getListLimitedPath: () => {
    return EPM_API_ROUTES.LIMITED_LIST_PATTERN;
  },

  getDatastreamsPath: () => {
    return EPM_API_ROUTES.DATA_STREAMS_PATTERN;
  },

  getInfoPath: (pkgName: string, pkgVersion?: string) => {
    if (pkgVersion) {
      return buildPath(EPM_API_ROUTES.INFO_PATTERN, { pkgName, pkgVersion });
    }

    return buildPath(EPM_API_ROUTES.INFO_WITHOUT_VERSION_PATTERN, { pkgName });
  },

  getStatsPath: (pkgName: string) => {
    return buildPath(EPM_API_ROUTES.STATS_PATTERN, { pkgName });
  },

  getDependenciesPath: (pkgName: string, pkgVersion: string) => {
    return buildPath(EPM_API_ROUTES.DEPENDENCIES_PATTERN, { pkgName, pkgVersion });
  },

  getFilePath: (filePath: string) => {
    return `${EPM_API_ROOT}${filePath
      .replace('/package', '/packages')
      .split('/')
      .map((segment) => (segment ? encodePathParam(segment) : segment))
      .join('/')}`;
  },

  getInstallPath: (pkgName: string, pkgVersion?: string) => {
    if (pkgVersion) {
      return buildPath(EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN, {
        pkgName,
        pkgVersion,
      }).replace(/\/$/, ''); // trim trailing slash
    }

    return buildPath(EPM_API_ROUTES.INSTALL_FROM_REGISTRY_WITHOUT_VERSION_PATTERN, {
      pkgName,
    }).replace(/\/$/, ''); // trim trailing slash
  },

  getBulkInstallPath: () => {
    return EPM_API_ROUTES.BULK_INSTALL_PATTERN;
  },

  getBulkUpgradePath: () => {
    return EPM_API_ROUTES.BULK_UPGRADE_PATTERN;
  },

  getBulkUninstallPath: () => {
    return EPM_API_ROUTES.BULK_UNINSTALL_PATTERN;
  },

  getOneBulkUpgradePath: (taskId: string) => {
    return buildPath(EPM_API_ROUTES.BULK_UPGRADE_INFO_PATTERN, { taskId });
  },

  getOneBulkUninstallPath: (taskId: string) => {
    return buildPath(EPM_API_ROUTES.BULK_UNINSTALL_INFO_PATTERN, { taskId });
  },

  getBulkRollbackPath: () => {
    return EPM_API_ROUTES.BULK_ROLLBACK_PATTERN;
  },

  getBulkRollbackInfoPath: (taskId: string) => {
    return buildPath(EPM_API_ROUTES.BULK_ROLLBACK_INFO_PATTERN, { taskId });
  },

  getRollbackAvailableCheckPath: (pkgName: string) => {
    return buildPath(EPM_API_ROUTES.ROLLBACK_AVAILABLE_CHECK_PATTERN, { pkgName });
  },

  getBulkRollbackAvailableCheckPath: () => {
    return EPM_API_ROUTES.BULK_ROLLBACK_AVAILABLE_CHECK_PATTERN;
  },

  getRemovePath: (pkgName: string, pkgVersion?: string) => {
    if (pkgVersion) {
      return buildPath(EPM_API_ROUTES.DELETE_PATTERN, { pkgName, pkgVersion }).replace(/\/$/, ''); // trim trailing slash
    }

    return buildPath(EPM_API_ROUTES.DELETE_WITHOUT_VERSION_PATTERN, { pkgName }).replace(/\/$/, ''); // trim trailing slash
  },

  getInstallKibanaAssetsPath: (pkgName: string, pkgVersion: string) => {
    return buildPath(EPM_API_ROUTES.INSTALL_KIBANA_ASSETS_PATTERN, { pkgName, pkgVersion }).replace(
      /\/$/,
      ''
    ); // trim trailing slash
  },

  getInstallRuleAssetsPath: (pkgName: string, pkgVersion: string) => {
    return buildPath(EPM_API_ROUTES.INSTALL_RULE_ASSETS_PATTERN, { pkgName, pkgVersion }).replace(
      /\/$/,
      ''
    ); // trim trailing slash
  },

  getUpdatePath: (pkgName: string, pkgVersion: string) => {
    return buildPath(EPM_API_ROUTES.INFO_PATTERN, { pkgName, pkgVersion });
  },

  getReviewUpgradePath: (pkgName: string) => {
    return buildPath(EPM_API_ROUTES.REVIEW_UPGRADE_PATTERN, { pkgName });
  },

  getNamespacePreflightCheckPath: (pkgName: string) => {
    return buildPath(EPM_API_ROUTES.NAMESPACE_PREFLIGHT_CHECK_PATTERN, { pkgName });
  },

  getReauthorizeTransformsPath: (pkgName: string, pkgVersion: string) => {
    return buildPath(EPM_API_ROUTES.REAUTHORIZE_TRANSFORMS, { pkgName, pkgVersion }).replace(
      /\/$/,
      ''
    ); // trim trailing slash
  },
  getBulkAssetsPath: () => {
    return EPM_API_ROUTES.BULK_ASSETS_PATTERN;
  },
  getInputsTemplatesPath: (pkgName: string, pkgVersion: string) => {
    return buildPath(EPM_API_ROUTES.INPUTS_PATTERN, { pkgName, pkgVersion });
  },
  getUpdateCustomIntegrationsPath: (pkgName: string) => {
    return buildPath(EPM_API_ROUTES.UPDATE_CUSTOM_INTEGRATIONS_PATTERN, { pkgName });
  },
  getDeletePackageDatastreamAssets: (pkgName: string, pkgVersion: string) => {
    return buildPath(EPM_API_ROUTES.PACKAGES_DATASTREAM_ASSETS, { pkgName, pkgVersion });
  },
  getIlmPoliciesPath: () => {
    return EPM_API_ROUTES.ILM_POLICIES_PATTERN;
  },
};

export const packagePolicyRouteService = {
  getListPath: () => {
    return PACKAGE_POLICY_API_ROUTES.LIST_PATTERN;
  },

  getInfoPath: (packagePolicyId: string) => {
    return buildPath(PACKAGE_POLICY_API_ROUTES.INFO_PATTERN, { packagePolicyId });
  },

  getCreatePath: () => {
    return PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN;
  },

  getUpdatePath: (packagePolicyId: string) => {
    return buildPath(PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN, { packagePolicyId });
  },

  getDeletePath: () => {
    return PACKAGE_POLICY_API_ROUTES.DELETE_PATTERN;
  },

  getUpgradePath: () => {
    return PACKAGE_POLICY_API_ROUTES.UPGRADE_PATTERN;
  },

  getDryRunPath: () => {
    return PACKAGE_POLICY_API_ROUTES.DRYRUN_PATTERN;
  },

  getOrphanedIntegrationPoliciesPath: () => {
    return PACKAGE_POLICY_API_ROUTES.ORPHANED_INTEGRATION_POLICIES;
  },

  getBulkGetPath: (): string => {
    return PACKAGE_POLICY_API_ROUTES.BULK_GET_PATTERN;
  },
};

export const agentlessPolicyRouteService = {
  getCreatePath: () => {
    return MANAGED_INTEGRATIONS_ROUTES.CREATE_PATTERN;
  },
  getListPath: () => {
    return MANAGED_INTEGRATIONS_ROUTES.LIST_PATTERN;
  },
  getInfoPath: (policyId: string) => {
    return buildPath(MANAGED_INTEGRATIONS_ROUTES.GET_PATTERN, { policyId });
  },
  getUpdatePath: (policyId: string) => {
    return buildPath(MANAGED_INTEGRATIONS_ROUTES.UPDATE_PATTERN, { policyId });
  },
  getDeletePath: (policyId: string) => {
    return buildPath(MANAGED_INTEGRATIONS_ROUTES.DELETE_PATTERN, { policyId });
  },
  getUpgradePath: () => {
    return MANAGED_INTEGRATIONS_ROUTES.UPGRADE_PATTERN;
  },
  getUpgradeDryRunPath: () => {
    return MANAGED_INTEGRATIONS_ROUTES.UPGRADE_DRYRUN_PATTERN;
  },
  getBulkThroughputPath: () => {
    return MANAGED_INTEGRATIONS_ROUTES.BULK_THROUGHPUT_PATTERN;
  },
};

export const agentPolicyRouteService = {
  getListPath: () => {
    return AGENT_POLICY_API_ROUTES.LIST_PATTERN;
  },

  getBulkGetPath: () => {
    return AGENT_POLICY_API_ROUTES.BULK_GET_PATTERN;
  },

  getInfoPath: (agentPolicyId: string) => {
    return buildPath(AGENT_POLICY_API_ROUTES.INFO_PATTERN, { agentPolicyId });
  },

  getAutoUpgradeAgentsStatusPath: (agentPolicyId: string) => {
    return buildPath(AGENT_POLICY_API_ROUTES.AUTO_UPGRADE_AGENTS_STATUS_PATTERN, { agentPolicyId });
  },

  getCreatePath: () => {
    return AGENT_POLICY_API_ROUTES.CREATE_PATTERN;
  },

  getUpdatePath: (agentPolicyId: string) => {
    return buildPath(AGENT_POLICY_API_ROUTES.UPDATE_PATTERN, { agentPolicyId });
  },

  getCopyPath: (agentPolicyId: string) => {
    return buildPath(AGENT_POLICY_API_ROUTES.COPY_PATTERN, { agentPolicyId });
  },

  getDeletePath: () => {
    return AGENT_POLICY_API_ROUTES.DELETE_PATTERN;
  },

  getInfoFullPath: (agentPolicyId: string) => {
    return buildPath(AGENT_POLICY_API_ROUTES.FULL_INFO_PATTERN, { agentPolicyId });
  },

  getInfoFullDownloadPath: (agentPolicyId: string) => {
    return buildPath(AGENT_POLICY_API_ROUTES.FULL_INFO_DOWNLOAD_PATTERN, { agentPolicyId });
  },

  getK8sInfoPath: () => {
    return K8S_API_ROUTES.K8S_INFO_PATTERN;
  },

  getK8sFullDownloadPath: () => {
    return K8S_API_ROUTES.K8S_DOWNLOAD_PATTERN;
  },

  getResetOnePreconfiguredAgentPolicyPath: (agentPolicyId: string) => {
    return buildPath(PRECONFIGURATION_API_ROUTES.RESET_ONE_PATTERN, { agentPolicyId });
  },

  getResetAllPreconfiguredAgentPolicyPath: () => {
    return PRECONFIGURATION_API_ROUTES.RESET_PATTERN;
  },

  getInfoOutputsPath: (agentPolicyId: string) => {
    return buildPath(AGENT_POLICY_API_ROUTES.INFO_OUTPUTS_PATTERN, { agentPolicyId });
  },

  getListOutputsPath: () => {
    return AGENT_POLICY_API_ROUTES.LIST_OUTPUTS_PATTERN;
  },
};

export const dataStreamRouteService = {
  getListPath: () => {
    return DATA_STREAM_API_ROUTES.LIST_PATTERN;
  },
  getDeprecatedILMCheckPath: () => {
    return DATA_STREAM_API_ROUTES.DEPRECATED_ILM_CHECK_PATTERN;
  },
};

export const fleetSetupRouteService = {
  getFleetSetupPath: () => AGENTS_SETUP_API_ROUTES.INFO_PATTERN,
  postFleetSetupPath: () => AGENTS_SETUP_API_ROUTES.CREATE_PATTERN,
};

export const agentRouteService = {
  getInfoPath: (agentId: string) => buildPath(AGENT_API_ROUTES.INFO_PATTERN, { agentId }),
  getUpdatePath: (agentId: string) => buildPath(AGENT_API_ROUTES.UPDATE_PATTERN, { agentId }),
  getBulkUpdateTagsPath: () => AGENT_API_ROUTES.BULK_UPDATE_AGENT_TAGS_PATTERN,
  getUnenrollPath: (agentId: string) => buildPath(AGENT_API_ROUTES.UNENROLL_PATTERN, { agentId }),
  getBulkUnenrollPath: () => AGENT_API_ROUTES.BULK_UNENROLL_PATTERN,
  getRemoveCollectorPath: (agentId: string) =>
    buildPath(AGENT_API_ROUTES.REMOVE_COLLECTOR_PATTERN, { agentId }),
  getBulkRemoveCollectorsPath: () => AGENT_API_ROUTES.BULK_REMOVE_COLLECTORS_PATTERN,
  getReassignPath: (agentId: string) => buildPath(AGENT_API_ROUTES.REASSIGN_PATTERN, { agentId }),
  getBulkReassignPath: () => AGENT_API_ROUTES.BULK_REASSIGN_PATTERN,
  getUpgradePath: (agentId: string) => buildPath(AGENT_API_ROUTES.UPGRADE_PATTERN, { agentId }),
  getBulkUpgradePath: () => AGENT_API_ROUTES.BULK_UPGRADE_PATTERN,
  getActionStatusPath: () => AGENT_API_ROUTES.ACTION_STATUS_PATTERN,
  getCancelActionPath: (actionId: string) =>
    buildPath(AGENT_API_ROUTES.CANCEL_ACTIONS_PATTERN, { actionId }),
  getListPath: () => AGENT_API_ROUTES.LIST_PATTERN,
  getStatusPath: () => AGENT_API_ROUTES.STATUS_PATTERN,
  getIncomingDataPath: () => AGENT_API_ROUTES.DATA_PATTERN,
  getCreateActionPath: (agentId: string) =>
    buildPath(AGENT_API_ROUTES.ACTIONS_PATTERN, { agentId }),
  getListTagsPath: () => AGENT_API_ROUTES.LIST_TAGS_PATTERN,
  getAvailableVersionsPath: () => AGENT_API_ROUTES.AVAILABLE_VERSIONS_PATTERN,
  getRequestDiagnosticsPath: (agentId: string) =>
    buildPath(AGENT_API_ROUTES.REQUEST_DIAGNOSTICS_PATTERN, { agentId }),
  getBulkRequestDiagnosticsPath: () => AGENT_API_ROUTES.BULK_REQUEST_DIAGNOSTICS_PATTERN,
  getListAgentUploads: (agentId: string) =>
    buildPath(AGENT_API_ROUTES.LIST_UPLOADS_PATTERN, { agentId }),
  getAgentFileDownloadLink: (fileId: string, fileName: string) =>
    buildPath(AGENT_API_ROUTES.GET_UPLOAD_FILE_PATTERN, { fileId, fileName }),
  getAgentFileDeletePath: (fileId: string) =>
    buildPath(AGENT_API_ROUTES.DELETE_UPLOAD_FILE_PATTERN, { fileId }),
  getAgentsByActionsPath: () => AGENT_API_ROUTES.LIST_PATTERN,
  postMigrateSingleAgent: (agentId: string) =>
    buildPath(AGENT_API_ROUTES.MIGRATE_PATTERN, { agentId }),
  postBulkMigrateAgents: () => AGENT_API_ROUTES.BULK_MIGRATE_PATTERN,
  postChangeAgentPrivilegeLevel: (agentId: string) =>
    buildPath(AGENT_API_ROUTES.PRIVILEGE_LEVEL_CHANGE_PATTERN, { agentId }),
  postBulkChangeAgentPrivilegeLevel: () => AGENT_API_ROUTES.BULK_PRIVILEGE_LEVEL_CHANGE_PATTERN,
  postAgentRollback: (agentId: string) => buildPath(AGENT_API_ROUTES.ROLLBACK_PATTERN, { agentId }),
  postBulkAgentRollback: () => AGENT_API_ROUTES.BULK_ROLLBACK_PATTERN,
  postGenerateAgentsReport: () => AGENT_API_ROUTES.GENERATE_REPORT_PATTERN,
  getAgentEffectiveConfig: (agentId: string) =>
    buildPath(AGENT_API_ROUTES.EFFECTIVE_CONFIG_PATTERN, { agentId }),
};

export const outputRoutesService = {
  getInfoPath: (outputId: string) => buildPath(OUTPUT_API_ROUTES.INFO_PATTERN, { outputId }),
  getUpdatePath: (outputId: string) => buildPath(OUTPUT_API_ROUTES.UPDATE_PATTERN, { outputId }),
  getListPath: () => OUTPUT_API_ROUTES.LIST_PATTERN,
  getDeletePath: (outputId: string) => buildPath(OUTPUT_API_ROUTES.DELETE_PATTERN, { outputId }),
  getCreatePath: () => OUTPUT_API_ROUTES.CREATE_PATTERN,
  getCreateLogstashApiKeyPath: () => OUTPUT_API_ROUTES.LOGSTASH_API_KEY_PATTERN,
  getOutputHealthPath: (outputId: string) =>
    buildPath(OUTPUT_API_ROUTES.GET_OUTPUT_HEALTH_PATTERN, { outputId }),
  getOutputAgentPolicyCountPath: (outputId: string) =>
    buildPath(OUTPUT_API_ROUTES.GET_OUTPUT_AGENT_POLICY_COUNT_PATTERN, { outputId }),
  getRemoteSyncedIntegrationsStatusPath: (outputId: string) =>
    buildPath(REMOTE_SYNCED_INTEGRATIONS_API_ROUTES.INFO_PATTERN, { outputId }),
};

export const fleetProxiesRoutesService = {
  getInfoPath: (itemId: string) => buildPath(FLEET_PROXY_API_ROUTES.INFO_PATTERN, { itemId }),
  getUpdatePath: (itemId: string) => buildPath(FLEET_PROXY_API_ROUTES.UPDATE_PATTERN, { itemId }),
  getListPath: () => FLEET_PROXY_API_ROUTES.LIST_PATTERN,
  getDeletePath: (itemId: string) => buildPath(FLEET_PROXY_API_ROUTES.DELETE_PATTERN, { itemId }),
  getCreatePath: () => FLEET_PROXY_API_ROUTES.CREATE_PATTERN,
};

export const fleetServerHostsRoutesService = {
  getInfoPath: (itemId: string) => buildPath(FLEET_SERVER_HOST_API_ROUTES.INFO_PATTERN, { itemId }),
  getUpdatePath: (itemId: string) =>
    buildPath(FLEET_SERVER_HOST_API_ROUTES.UPDATE_PATTERN, { itemId }),
  getListPath: () => FLEET_SERVER_HOST_API_ROUTES.LIST_PATTERN,
  getDeletePath: (itemId: string) =>
    buildPath(FLEET_SERVER_HOST_API_ROUTES.DELETE_PATTERN, { itemId }),
  getCreatePath: () => FLEET_SERVER_HOST_API_ROUTES.CREATE_PATTERN,
  getPolicyStatusPath: () => FLEET_SERVER_HOST_API_ROUTES.POLICY_STATUS_PATTERN,
};

export const settingsRoutesService = {
  getInfoPath: () => SETTINGS_API_ROUTES.INFO_PATTERN,
  getUpdatePath: () => SETTINGS_API_ROUTES.UPDATE_PATTERN,
  getEnrollmentInfoPath: () => SETTINGS_API_ROUTES.ENROLLMENT_INFO_PATTERN,
  getSpaceInfoPath: () => SETTINGS_API_ROUTES.SPACE_INFO_PATTERN,
  postSpaceAwarenessMigrationPath: () => APP_API_ROUTES.SPACE_AWARENESS_MIGRATION,
};

export const appRoutesService = {
  getCheckPermissionsPath: () => APP_API_ROUTES.CHECK_PERMISSIONS_PATTERN,
  getRegenerateServiceTokenPath: () => APP_API_ROUTES.GENERATE_SERVICE_TOKEN_PATTERN,
  postHealthCheckPath: () => APP_API_ROUTES.HEALTH_CHECK_PATTERN,
  getAgentPoliciesSpacesPath: () => APP_API_ROUTES.AGENT_POLICIES_SPACES,
};

export const enrollmentAPIKeyRouteService = {
  getListPath: () => ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN,
  getCreatePath: () => ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN,
  getInfoPath: (keyId: string) => buildPath(ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN, { keyId }),
  getDeletePath: (keyId: string) => buildPath(ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN, { keyId }),
  getBulkDeletePath: () => ENROLLMENT_API_KEY_ROUTES.BULK_DELETE_PATTERN,
};

export const uninstallTokensRouteService = {
  getListPath: () => UNINSTALL_TOKEN_ROUTES.LIST_PATTERN,
  getInfoPath: (uninstallTokenId: string) =>
    buildPath(UNINSTALL_TOKEN_ROUTES.INFO_PATTERN, { uninstallTokenId }),
};

export const setupRouteService = {
  getSetupPath: () => SETUP_API_ROUTE,
};

export const downloadSourceRoutesService = {
  getInfoPath: (downloadSourceId: string) =>
    buildPath(DOWNLOAD_SOURCE_API_ROUTES.INFO_PATTERN, { sourceId: downloadSourceId }),
  getUpdatePath: (downloadSourceId: string) =>
    buildPath(DOWNLOAD_SOURCE_API_ROUTES.UPDATE_PATTERN, { sourceId: downloadSourceId }),
  getListPath: () => DOWNLOAD_SOURCE_API_ROUTES.LIST_PATTERN,
  getDeletePath: (downloadSourceId: string) =>
    buildPath(DOWNLOAD_SOURCE_API_ROUTES.DELETE_PATTERN, { sourceId: downloadSourceId }),
  getCreatePath: () => DOWNLOAD_SOURCE_API_ROUTES.CREATE_PATTERN,
};

export const debugRoutesService = {
  getIndexPath: () => FLEET_DEBUG_ROUTES.INDEX_PATTERN,
  getSavedObjectsPath: () => FLEET_DEBUG_ROUTES.SAVED_OBJECTS_PATTERN,
  getSavedObjectNamesPath: () => FLEET_DEBUG_ROUTES.SAVED_OBJECT_NAMES_PATTERN,
};

export declare const epmRouteService: {
    getVerificationKeyIdPath: () => string;
    getCategoriesPath: () => string;
    getListPath: () => string;
    getListLimitedPath: () => string;
    getDatastreamsPath: () => string;
    getInfoPath: (pkgName: string, pkgVersion?: string) => string;
    getStatsPath: (pkgName: string) => string;
    getDependenciesPath: (pkgName: string, pkgVersion: string) => string;
    getFilePath: (filePath: string) => string;
    getInstallPath: (pkgName: string, pkgVersion?: string) => string;
    getBulkInstallPath: () => string;
    getBulkUpgradePath: () => string;
    getBulkUninstallPath: () => string;
    getOneBulkUpgradePath: (taskId: string) => string;
    getOneBulkUninstallPath: (taskId: string) => string;
    getBulkRollbackPath: () => string;
    getBulkRollbackInfoPath: (taskId: string) => string;
    getRollbackAvailableCheckPath: (pkgName: string) => string;
    getBulkRollbackAvailableCheckPath: () => string;
    getRemovePath: (pkgName: string, pkgVersion?: string) => string;
    getInstallKibanaAssetsPath: (pkgName: string, pkgVersion: string) => string;
    getInstallRuleAssetsPath: (pkgName: string, pkgVersion: string) => string;
    getUpdatePath: (pkgName: string, pkgVersion: string) => string;
    getReviewUpgradePath: (pkgName: string) => string;
    getReauthorizeTransformsPath: (pkgName: string, pkgVersion: string) => string;
    getBulkAssetsPath: () => string;
    getInputsTemplatesPath: (pkgName: string, pkgVersion: string) => string;
    getUpdateCustomIntegrationsPath: (pkgName: string) => string;
    getDeletePackageDatastreamAssets: (pkgName: string, pkgVersion: string) => string;
};
export declare const packagePolicyRouteService: {
    getListPath: () => string;
    getInfoPath: (packagePolicyId: string) => string;
    getCreatePath: () => string;
    getUpdatePath: (packagePolicyId: string) => string;
    getDeletePath: () => string;
    getUpgradePath: () => string;
    getDryRunPath: () => string;
    getOrphanedIntegrationPoliciesPath: () => string;
    getBulkGetPath: () => string;
};
export declare const agentlessPolicyRouteService: {
    getCreatePath: () => string;
    getDeletePath: (policyId: string) => string;
};
export declare const agentPolicyRouteService: {
    getListPath: () => string;
    getBulkGetPath: () => string;
    getInfoPath: (agentPolicyId: string) => string;
    getAutoUpgradeAgentsStatusPath: (agentPolicyId: string) => string;
    getCreatePath: () => string;
    getUpdatePath: (agentPolicyId: string) => string;
    getCopyPath: (agentPolicyId: string) => string;
    getDeletePath: () => string;
    getInfoFullPath: (agentPolicyId: string) => string;
    getInfoFullDownloadPath: (agentPolicyId: string) => string;
    getK8sInfoPath: () => string;
    getK8sFullDownloadPath: () => string;
    getResetOnePreconfiguredAgentPolicyPath: (agentPolicyId: string) => string;
    getResetAllPreconfiguredAgentPolicyPath: () => string;
    getInfoOutputsPath: (agentPolicyId: string) => string;
    getListOutputsPath: () => string;
};
export declare const dataStreamRouteService: {
    getListPath: () => string;
    getDeprecatedILMCheckPath: () => string;
};
export declare const fleetSetupRouteService: {
    getFleetSetupPath: () => string;
    postFleetSetupPath: () => string;
};
export declare const agentRouteService: {
    getInfoPath: (agentId: string) => string;
    getUpdatePath: (agentId: string) => string;
    getBulkUpdateTagsPath: () => string;
    getUnenrollPath: (agentId: string) => string;
    getBulkUnenrollPath: () => string;
    getRemoveCollectorPath: (agentId: string) => string;
    getBulkRemoveCollectorsPath: () => string;
    getReassignPath: (agentId: string) => string;
    getBulkReassignPath: () => string;
    getUpgradePath: (agentId: string) => string;
    getBulkUpgradePath: () => string;
    getActionStatusPath: () => string;
    getCancelActionPath: (actionId: string) => string;
    getListPath: () => string;
    getStatusPath: () => string;
    getIncomingDataPath: () => string;
    getCreateActionPath: (agentId: string) => string;
    getListTagsPath: () => string;
    getAvailableVersionsPath: () => string;
    getRequestDiagnosticsPath: (agentId: string) => string;
    getBulkRequestDiagnosticsPath: () => string;
    getListAgentUploads: (agentId: string) => string;
    getAgentFileDownloadLink: (fileId: string, fileName: string) => string;
    getAgentFileDeletePath: (fileId: string) => string;
    getAgentsByActionsPath: () => string;
    postMigrateSingleAgent: (agentId: string) => string;
    postBulkMigrateAgents: () => string;
    postChangeAgentPrivilegeLevel: (agentId: string) => string;
    postBulkChangeAgentPrivilegeLevel: () => string;
    postAgentRollback: (agentId: string) => string;
    postBulkAgentRollback: () => string;
    postGenerateAgentsReport: () => string;
    getAgentEffectiveConfig: (agentId: string) => string;
};
export declare const outputRoutesService: {
    getInfoPath: (outputId: string) => string;
    getUpdatePath: (outputId: string) => string;
    getListPath: () => string;
    getDeletePath: (outputId: string) => string;
    getCreatePath: () => string;
    getCreateLogstashApiKeyPath: () => string;
    getOutputHealthPath: (outputId: string) => string;
    getRemoteSyncedIntegrationsStatusPath: (outputId: string) => string;
};
export declare const fleetProxiesRoutesService: {
    getInfoPath: (itemId: string) => string;
    getUpdatePath: (itemId: string) => string;
    getListPath: () => string;
    getDeletePath: (itemId: string) => string;
    getCreatePath: () => string;
};
export declare const fleetServerHostsRoutesService: {
    getInfoPath: (itemId: string) => string;
    getUpdatePath: (itemId: string) => string;
    getListPath: () => string;
    getDeletePath: (itemId: string) => string;
    getCreatePath: () => string;
    getPolicyStatusPath: () => string;
};
export declare const settingsRoutesService: {
    getInfoPath: () => string;
    getUpdatePath: () => string;
    getEnrollmentInfoPath: () => string;
    getSpaceInfoPath: () => string;
    postSpaceAwarenessMigrationPath: () => string;
};
export declare const appRoutesService: {
    getCheckPermissionsPath: () => string;
    getRegenerateServiceTokenPath: () => string;
    postHealthCheckPath: () => string;
    getAgentPoliciesSpacesPath: () => string;
};
export declare const enrollmentAPIKeyRouteService: {
    getListPath: () => string;
    getCreatePath: () => string;
    getInfoPath: (keyId: string) => string;
    getDeletePath: (keyId: string) => string;
    getBulkDeletePath: () => string;
};
export declare const uninstallTokensRouteService: {
    getListPath: () => string;
    getInfoPath: (uninstallTokenId: string) => string;
};
export declare const setupRouteService: {
    getSetupPath: () => string;
};
export declare const downloadSourceRoutesService: {
    getInfoPath: (downloadSourceId: string) => string;
    getUpdatePath: (downloadSourceId: string) => string;
    getListPath: () => string;
    getDeletePath: (downloadSourceId: string) => string;
    getCreatePath: () => string;
};
export declare const debugRoutesService: {
    getIndexPath: () => string;
    getSavedObjectsPath: () => string;
    getSavedObjectNamesPath: () => string;
};

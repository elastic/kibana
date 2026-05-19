export declare const TASK_TYPE = "fleet:setup";
export declare const TASK_TITLE = "Fleet setup operations";
export declare const TASK_TIMEOUT = "10m";
export interface SetupTaskParams {
    type: 'backportPackagePolicyInputId' | 'migrateComponentTemplateILMs' | 'upgradePackageInstallVersion' | 'reinstallPackagesForGlobalAssetUpdate';
}

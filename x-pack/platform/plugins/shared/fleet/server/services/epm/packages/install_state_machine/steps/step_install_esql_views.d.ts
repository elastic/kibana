import type { InstallContext } from '../_state_machine_package_install';
export declare function stepInstallEsqlViews(context: InstallContext): Promise<{
    esReferences: import("../../../../../../common/types").EsAssetReference[];
}>;
export declare function cleanupEsqlViewsStep(context: InstallContext): Promise<void>;

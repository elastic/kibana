import type { InstallContext } from '../_state_machine_package_install';
export declare function stepInstallMlModel(context: InstallContext): Promise<{
    esReferences: import("../../../../../../common/types").EsAssetReference[];
}>;
export declare function cleanUpMlModelStep(context: InstallContext): Promise<void>;

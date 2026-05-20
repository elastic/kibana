import type { InstallContext } from '../_state_machine_package_install';
export declare function stepInstallTransforms(context: InstallContext): Promise<{
    esReferences: import("../../../../../../common/types").EsAssetReference[];
}>;
export declare function cleanupTransformsStep(context: InstallContext): Promise<void>;

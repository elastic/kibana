import type { InstallContext } from '../_state_machine_package_install';
export declare function stepInstallILMPolicies(context: InstallContext): Promise<{
    esReferences: import("../../../../../../common/types").EsAssetReference[];
}>;
export declare function cleanupILMPoliciesStep(context: InstallContext): Promise<void>;

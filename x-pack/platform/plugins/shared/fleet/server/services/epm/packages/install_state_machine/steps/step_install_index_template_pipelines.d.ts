import type { InstallContext } from '../_state_machine_package_install';
export declare function stepInstallIndexTemplatePipelines(context: InstallContext): Promise<{
    esReferences: import("../../../../../../common/types").EsAssetReference[];
    indexTemplates: import("../../../../../../common/types").IndexTemplateEntry[];
} | undefined>;
export declare function cleanupIndexTemplatePipelinesStep(context: InstallContext): Promise<void>;

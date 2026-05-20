import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
export interface AgentBuilderAccess {
    hasRequiredLicense: boolean;
    hasLlmConnector: boolean;
}
export declare class AgentBuilderAccessChecker {
    private readonly licensing;
    private readonly inference;
    private access;
    constructor({ licensing, inference, }: {
        licensing: LicensingPluginStart;
        inference: InferencePublicStart;
    });
    private hasRequiredLicense;
    private hasLlmConnector;
    initAccess(): Promise<void>;
    getAccess(): AgentBuilderAccess;
}

import type { EmbeddableChatAccess } from '@kbn/agent-builder-browser';
import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
export declare const deniedEmbeddableChatAccess: () => EmbeddableChatAccess;
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
    getAccess(): EmbeddableChatAccess;
    getAgentBuilderAccess(): Promise<EmbeddableChatAccess>;
}

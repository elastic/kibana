/**
 * Constants for all default (preconfigured) inference endpoints.
 */
export declare const defaultInferenceEndpoints: {
    readonly JINAv5: ".jina-embeddings-v5-text-small";
    readonly ELSER: ".elser-2-elasticsearch";
    readonly ELSER_IN_EIS_INFERENCE_ID: ".elser-2-elastic";
    readonly MULTILINGUAL_E5_SMALL: ".multilingual-e5-small-elasticsearch";
    readonly KIBANA_DEFAULT_CHAT_COMPLETION: ".anthropic-claude-4.6-sonnet-chat_completion";
    readonly OPENAI_GPT_5_2: ".openai-gpt-5.2-chat_completion";
    readonly OPENAI_GPT_5_4: ".openai-gpt-5.4-chat_completion";
    readonly OPENAI_GPT_OSS_120B: ".openai-gpt-oss-120b-chat_completion";
    readonly ANTHROPIC_CLAUDE_4_6_OPUS: ".anthropic-claude-4.6-opus-chat_completion";
    readonly ANTHROPIC_CLAUDE_4_6_SONNET: ".anthropic-claude-4.6-sonnet-chat_completion";
};
/**
 * Constants for relevant inference providers
 */
export declare enum InferenceEndpointProvider {
    /** Elastic (on EIS) */
    Elastic = "elastic",
    /** Claude on bedrock */
    AmazonBedrock = "amazonbedrock",
    /** Azure OpenAI */
    AzureOpenAI = "azureopenai",
    /** Gemini */
    GoogleVertexAI = "googlevertexai",
    /** Open AI */
    OpenAI = "openai"
}
export declare const elasticModelIds: {
    readonly RainbowSprinkles: "rainbow-sprinkles";
};
export interface CspRegion {
    csp: string;
    region: string;
    geo?: string;
}
/** A region entry that carries only a geographic zone with no CSP/region detail. */
export interface GeoOnlyRegion {
    geo: string;
}
/** Union of all region entry shapes returned by the EIS metadata.regions field. */
export type EisRegion = CspRegion | GeoOnlyRegion;
export type EisInferenceEndpointMetadata = {
    heuristics?: {
        properties?: string[];
        status?: string;
        release_date?: string;
        end_of_life_date?: string;
    } & Record<string, unknown>;
    display?: {
        name?: string;
        model_creator?: string;
    } & Record<string, unknown>;
    regions?: EisRegion[];
} & Record<string, unknown>;

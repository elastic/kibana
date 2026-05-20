import type { ChatCompletionTokenCount, Model } from '@kbn/inference-common';
export interface TokenUsageContext {
    connectorId: string;
    featureId?: string;
    parentFeatureId?: string;
    modelId?: string;
    modelCreator?: string;
    modelName?: string;
    provider?: string;
}
export interface TokenUsageContextInput {
    connectorId: string;
    model?: Partial<Model>;
    modelName?: string;
    featureId?: string;
    parentFeatureId?: string;
}
export declare const buildTokenUsageContext: ({ connectorId, model, modelName, featureId, parentFeatureId, }: TokenUsageContextInput) => TokenUsageContext;
export interface TokenUsageDocument {
    '@timestamp': string;
    token_usage: {
        prompt_tokens: number;
        completion_tokens: number;
        thinking_tokens?: number;
        total_tokens: number;
        cached_tokens?: number;
    };
    model: {
        model_id?: string;
        model_creator?: string;
        model_name?: string;
        provider?: string;
    };
    inference: {
        connector_id: string;
        feature_id?: string;
        parent_feature_id?: string;
    };
}
export declare const mapTokenCountToDocument: ({ tokens, model, context, }: {
    tokens: ChatCompletionTokenCount;
    model?: string;
    context: TokenUsageContext;
}) => TokenUsageDocument;

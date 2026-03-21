import type OpenAI from 'openai';
export type OpenAIRequest = Omit<OpenAI.ChatCompletionCreateParams, 'model'> & {
    model?: string;
};
export declare enum OpenAiProviderType {
    OpenAi = "OpenAI",
    AzureAi = "Azure OpenAI",
    Other = "Other"
}

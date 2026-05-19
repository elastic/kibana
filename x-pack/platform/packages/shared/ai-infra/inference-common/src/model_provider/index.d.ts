export declare enum ModelPlatform {
    OpenAI = "OpenAI",
    AzureOpenAI = "AzureOpenAI",
    AmazonBedrock = "AmazonBedrock",
    GoogleVertex = "GoogleVertex",
    Elastic = "Elastic",
    Other = "other"
}
export declare enum ModelProvider {
    OpenAI = "OpenAI",
    Anthropic = "Anthropic",
    Google = "Google",
    Other = "Other",
    Elastic = "Elastic"
}
export declare enum ModelFamily {
    GPT = "GPT",
    Claude = "Claude",
    Gemini = "Gemini"
}
export interface Model {
    provider: ModelProvider;
    family: ModelFamily;
    id?: string;
    creator?: string;
    name?: string;
    platform?: ModelPlatform;
}

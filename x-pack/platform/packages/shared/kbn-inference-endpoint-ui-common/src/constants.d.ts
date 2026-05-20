import React from 'react';
import type { InternalOverrideFieldsType } from './types/types';
export declare enum ServiceProviderKeys {
    'alibabacloud-ai-search' = "alibabacloud-ai-search",
    amazonbedrock = "amazonbedrock",
    'amazon_sagemaker' = "amazon_sagemaker",
    anthropic = "anthropic",
    azureaistudio = "azureaistudio",
    azureopenai = "azureopenai",
    cohere = "cohere",
    deepseek = "deepseek",
    elastic = "elastic",
    elasticsearch = "elasticsearch",
    googleaistudio = "googleaistudio",
    googlevertexai = "googlevertexai",
    groq = "groq",
    hugging_face = "hugging_face",
    jinaai = "jinaai",
    mistral = "mistral",
    openai = "openai",
    voyageai = "voyageai",
    watsonxai = "watsonxai",
    ai21 = "ai21",
    llama = "llama",
    contextualai = "contextualai",
    fireworksai = "fireworksai",
    nvidia = "nvidia"
}
export declare const GEMINI_REGION_DOC_LINK: React.JSX.Element;
export declare const GEMINI_PROJECT_ID_DOC_LINK: React.JSX.Element;
export declare const serviceProviderLinkComponents: Partial<Record<ServiceProviderKeys, Record<string, React.ReactNode>>>;
export declare const DEFAULT_TASK_TYPE = "completion";
export declare const CHAT_COMPLETION_TASK_TYPE = "chat_completion";
export declare const internalProviderKeys: Array<ServiceProviderKeys | string>;
export declare const MAX_NUMBER_OF_ALLOCATIONS = "max_number_of_allocations";
export declare const CONTEXT_WINDOW_LENGTH = "contextWindowLength";
export declare const SERVICE_SETTINGS = "service_settings";
export declare const TASK_SETTINGS = "task_settings";
export declare const TASK_TYPE_CONFIG = "taskTypeConfig";
export declare const PROVIDER_CONFIG = "providerConfig";
export declare const PROVIDER_SECRETS = "providerSecrets";
export declare const INTERNAL_OVERRIDE_FIELDS: InternalOverrideFieldsType;

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
export declare const ELSER_MODEL_ID = ".elser_model_2";
export declare const ELSER_LINUX_OPTIMIZED_MODEL_ID = ".elser_model_2_linux-x86_64";
export declare const E5_MODEL_ID = ".multilingual-e5-small";
export declare const E5_LINUX_OPTIMIZED_MODEL_ID = ".multilingual-e5-small_linux-x86_64";
export declare const RERANK_MODEL_ID = ".rerank-v1";
export declare const LANG_IDENT_MODEL_ID = "lang_ident_model_1";
export declare const ELSER_ID_V1: ".elser_model_1";
export declare const LATEST_ELSER_VERSION: ElserVersion;
export declare const LATEST_ELSER_MODEL_ID = ".elser_model_2_linux-x86_64";
export declare const LATEST_E5_MODEL_ID = ".multilingual-e5-small_linux-x86_64";
export declare const ElserModels: string[];
export declare const DEPLOYMENT_STATE: {
    readonly STARTED: "started";
    readonly STARTING: "starting";
    readonly STOPPING: "stopping";
};
export type DeploymentState = (typeof DEPLOYMENT_STATE)[keyof typeof DEPLOYMENT_STATE];
export declare const TRAINED_MODEL_TYPE: {
    readonly PYTORCH: "pytorch";
    readonly TREE_ENSEMBLE: "tree_ensemble";
    readonly LANG_IDENT: "lang_ident";
};
export type TrainedModelType = (typeof TRAINED_MODEL_TYPE)[keyof typeof TRAINED_MODEL_TYPE];
export declare const SUPPORTED_PYTORCH_TASKS: {
    readonly NER: "ner";
    readonly QUESTION_ANSWERING: "question_answering";
    readonly ZERO_SHOT_CLASSIFICATION: "zero_shot_classification";
    readonly TEXT_CLASSIFICATION: "text_classification";
    readonly TEXT_EMBEDDING: "text_embedding";
    readonly FILL_MASK: "fill_mask";
    readonly TEXT_EXPANSION: "text_expansion";
};
export type SupportedPytorchTasksType = (typeof SUPPORTED_PYTORCH_TASKS)[keyof typeof SUPPORTED_PYTORCH_TASKS];
export declare const BUILT_IN_MODEL_TYPE: string;
export declare const ELASTIC_MODEL_TYPE = "elastic";
export declare const BUILT_IN_MODEL_TAG = "prepackaged";
export declare const ELASTIC_MODEL_TAG = "elastic";
export declare const ELASTIC_MODEL_DEFINITIONS: Record<string, Omit<ModelDefinition, 'supported'>>;
export type ElasticCuratedModelName = 'elser' | 'e5' | 'rerank';
export interface ModelDefinition {
    /**
     * Model name, e.g. elser
     */
    modelName: ElasticCuratedModelName;
    version: number;
    /**
     * Default PUT model configuration
     */
    config: object;
    description: string;
    os?: string;
    arch?: string;
    default?: boolean;
    /** Indicates if model version is recommended for deployment based on the cluster configuration */
    recommended?: boolean;
    /** Indicates if model version is supported by the cluster */
    supported: boolean;
    hidden?: boolean;
    /** Software license of a model, e.g. MIT */
    license?: string;
    /** Link to the external license/documentation page */
    licenseUrl?: string;
    type?: readonly string[];
    disclaimer?: string;
    /** Indicates if model is in tech preview */
    techPreview?: boolean;
}
export type ModelDefinitionResponse = ModelDefinition & {
    /**
     * Complete model id, e.g. .elser_model_2_linux-x86_64
     */
    model_id: string;
};
export type ElasticModelId = keyof typeof ELASTIC_MODEL_DEFINITIONS;
export declare const MODEL_STATE: {
    readonly DOWNLOADING: "downloading";
    readonly DOWNLOADED: "downloaded";
    readonly NOT_DOWNLOADED: "notDownloaded";
    readonly DOWNLOADED_IN_DIFFERENT_SPACE: "downloadedInDifferentSpace";
    readonly STARTED: "started";
    readonly STARTING: "starting";
    readonly STOPPING: "stopping";
};
export type ModelState = (typeof MODEL_STATE)[keyof typeof MODEL_STATE] | null;
export type ElserVersion = 1 | 2;
export interface GetModelDownloadConfigOptions {
    version?: ElserVersion;
}
export interface LocalInferenceServiceSettings {
    service: 'elasticsearch';
    service_settings: {
        num_allocations: number;
        num_threads: number;
        model_id: string;
    } | {
        num_threads: number;
        model_id: string;
        adaptive_allocations: {
            enabled: true;
            min_number_of_allocations: number;
            max_number_of_allocations: number;
        };
    };
}
export type InferenceServiceSettings = LocalInferenceServiceSettings | {
    service: 'openai';
    service_settings: {
        api_key: string;
        organization_id: string;
        url: string;
        model_id: string;
    };
} | {
    service: 'mistral';
    service_settings: {
        api_key: string;
        model: string;
        max_input_tokens: string;
        rate_limit: {
            requests_per_minute: number;
        };
    };
} | {
    service: 'cohere';
    service_settings: {
        similarity: string;
        dimensions: string;
        model_id: string;
        embedding_type: string;
    };
} | {
    service: 'azureaistudio';
    service_settings: {
        target: string;
        provider: string;
        embedding_type: string;
    };
} | {
    service: 'azureopenai';
    service_settings: {
        resource_name: string;
        deployment_id: string;
        api_version: string;
    };
} | {
    service: 'googleaistudio';
    service_settings: {
        model_id: string;
        rate_limit: {
            requests_per_minute: number;
        };
    };
} | {
    service: 'hugging_face';
    service_settings: {
        api_key: string;
        url: string;
    };
} | {
    service: 'alibabacloud-ai-search';
    service_settings: {
        api_key: string;
        service_id: string;
        host: string;
        workspace: string;
        http_schema: 'https' | 'http';
        rate_limit: {
            requests_per_minute: number;
        };
    };
} | {
    service: 'watsonxai';
    service_settings: {
        api_key: string;
        url: string;
        model_id: string;
        project_id: string;
        api_version: string;
    };
} | {
    service: 'amazonbedrock';
    service_settings: {
        access_key: string;
        secret_key: string;
        region: string;
        provider: string;
        model: string;
    };
} | {
    service: 'elastic';
    service_settings: {
        model_id: string;
    };
};
export type InferenceAPIConfigResponse = InferenceInferenceEndpointInfo & InferenceServiceSettings;
export declare function isLocalModel(model: InferenceServiceSettings): model is LocalInferenceServiceSettings;

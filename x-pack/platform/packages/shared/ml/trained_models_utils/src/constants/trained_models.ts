/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';

export const ELSER_MODEL_ID = '.elser_model_2';
export const ELSER_LINUX_OPTIMIZED_MODEL_ID = '.elser_model_2_linux-x86_64';
export const E5_MODEL_ID = '.multilingual-e5-small';
export const E5_LINUX_OPTIMIZED_MODEL_ID = '.multilingual-e5-small_linux-x86_64';
export const RERANK_MODEL_ID = '.rerank-v1';
export const LANG_IDENT_MODEL_ID = 'lang_ident_model_1';
export const ELSER_ID_V1 = '.elser_model_1' as const;
export const LATEST_ELSER_VERSION: ElserVersion = 2;
export const LATEST_ELSER_MODEL_ID = ELSER_LINUX_OPTIMIZED_MODEL_ID;
export const LATEST_E5_MODEL_ID = E5_LINUX_OPTIMIZED_MODEL_ID;

export const ElserModels = [ELSER_MODEL_ID, ELSER_LINUX_OPTIMIZED_MODEL_ID, ELSER_ID_V1];

export const DEPLOYMENT_STATE = {
  STARTED: 'started',
  STARTING: 'starting',
  STOPPING: 'stopping',
} as const;

export type DeploymentState = (typeof DEPLOYMENT_STATE)[keyof typeof DEPLOYMENT_STATE];

export const TRAINED_MODEL_TYPE = {
  PYTORCH: 'pytorch',
  TREE_ENSEMBLE: 'tree_ensemble',
  LANG_IDENT: 'lang_ident',
} as const;
export type TrainedModelType = (typeof TRAINED_MODEL_TYPE)[keyof typeof TRAINED_MODEL_TYPE];

export const SUPPORTED_PYTORCH_TASKS = {
  NER: 'ner',
  QUESTION_ANSWERING: 'question_answering',
  ZERO_SHOT_CLASSIFICATION: 'zero_shot_classification',
  TEXT_CLASSIFICATION: 'text_classification',
  TEXT_EMBEDDING: 'text_embedding',
  FILL_MASK: 'fill_mask',
  // Not supported yet by the Trained Models UI
  TEXT_EXPANSION: 'text_expansion',
} as const;
export type SupportedPytorchTasksType =
  (typeof SUPPORTED_PYTORCH_TASKS)[keyof typeof SUPPORTED_PYTORCH_TASKS];

export const BUILT_IN_MODEL_TYPE = i18n.translate(
  'xpack.ml.trainedModels.modelsList.builtInModelLabel',
  { defaultMessage: 'built-in' }
);

export const ELASTIC_MODEL_TYPE = 'elastic';

export const BUILT_IN_MODEL_TAG = 'prepackaged';

export const ELASTIC_MODEL_TAG = 'elastic';

export const ELASTIC_MODEL_DEFINITIONS: Record<
  string,
  Omit<ModelDefinition, 'supported'>
> = Object.freeze({
  [ELSER_ID_V1]: {
    modelName: 'elser',
    hidden: true,
    version: 1,
    config: {
      input: {
        field_names: ['text_field'],
      },
    },
    description: i18n.translate('xpack.ml.trainedModels.modelsList.elserDescription', {
      defaultMessage: 'Elastic Learned Sparse EncodeR v1 (Tech Preview)',
    }),
    type: ['elastic', 'pytorch', 'text_expansion'],
  },
  [ELSER_MODEL_ID]: {
    modelName: 'elser',
    version: 2,
    default: true,
    config: {
      input: {
        field_names: ['text_field'],
      },
    },
    description: i18n.translate('xpack.ml.trainedModels.modelsList.elserV2Description', {
      defaultMessage: 'Elastic Learned Sparse EncodeR v2',
    }),
    type: ['elastic', 'pytorch', 'text_expansion'],
  },
  [ELSER_LINUX_OPTIMIZED_MODEL_ID]: {
    modelName: 'elser',
    version: 2,
    os: 'Linux',
    arch: 'amd64',
    config: {
      input: {
        field_names: ['text_field'],
      },
    },
    description: i18n.translate('xpack.ml.trainedModels.modelsList.elserV2x86Description', {
      defaultMessage: 'Elastic Learned Sparse EncodeR v2, optimized for linux-x86_64',
    }),
    type: ['elastic', 'pytorch', 'text_expansion'],
  },
  [E5_MODEL_ID]: {
    modelName: 'e5',
    version: 1,
    default: true,
    config: {
      input: {
        field_names: ['text_field'],
      },
    },
    description: i18n.translate('xpack.ml.trainedModels.modelsList.e5v1Description', {
      defaultMessage: 'E5 (EmbEddings from bidirEctional Encoder rEpresentations)',
    }),
    license: 'MIT',
    licenseUrl: 'https://huggingface.co/elastic/multilingual-e5-small',
    type: ['pytorch', 'text_embedding'],
    disclaimer: i18n.translate('xpack.ml.trainedModels.modelsList.e5v1Disclaimer', {
      defaultMessage:
        'This E5 model, as defined, hosted, integrated and used in conjunction with our other Elastic Software is covered by our standard warranty.',
    }),
  },
  [E5_LINUX_OPTIMIZED_MODEL_ID]: {
    modelName: 'e5',
    version: 1,
    os: 'Linux',
    arch: 'amd64',
    config: {
      input: {
        field_names: ['text_field'],
      },
    },
    description: i18n.translate('xpack.ml.trainedModels.modelsList.e5v1x86Description', {
      defaultMessage:
        'E5 (EmbEddings from bidirEctional Encoder rEpresentations), optimized for linux-x86_64',
    }),
    license: 'MIT',
    licenseUrl: 'https://huggingface.co/elastic/multilingual-e5-small_linux-x86_64',
    type: ['pytorch', 'text_embedding'],
    disclaimer: i18n.translate('xpack.ml.trainedModels.modelsList.e5v1Disclaimer', {
      defaultMessage:
        'This E5 model, as defined, hosted, integrated and used in conjunction with our other Elastic Software is covered by our standard warranty.',
    }),
  },
  [RERANK_MODEL_ID]: {
    techPreview: true,
    default: true,
    hidden: true,
    modelName: 'rerank',
    version: 1,
    config: {
      input: {
        field_names: ['input', 'query'],
      },
    },
    description: i18n.translate('xpack.ml.trainedModels.modelsList.rerankDescription', {
      defaultMessage: 'Elastic Rerank v1',
    }),
    type: ['pytorch', 'text_similarity'],
  },
} as const);

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

export const MODEL_STATE = {
  ...DEPLOYMENT_STATE,
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  NOT_DOWNLOADED: 'notDownloaded',
} as const;

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
  };
}

export type InferenceServiceSettings =
  | LocalInferenceServiceSettings
  | {
      service: 'openai';
      service_settings: {
        api_key: string;
        organization_id: string;
        url: string;
        model_id: string;
      };
    }
  | {
      service: 'mistral';
      service_settings: {
        api_key: string;
        model: string;
        max_input_tokens: string;
        rate_limit: {
          requests_per_minute: number;
        };
      };
    }
  | {
      service: 'cohere';
      service_settings: {
        similarity: string;
        dimensions: string;
        model_id: string;
        embedding_type: string;
      };
    }
  | {
      service: 'azureaistudio';
      service_settings: {
        target: string;
        provider: string;
        embedding_type: string;
      };
    }
  | {
      service: 'azureopenai';
      service_settings: {
        resource_name: string;
        deployment_id: string;
        api_version: string;
      };
    }
  | {
      service: 'googleaistudio';
      service_settings: {
        model_id: string;
        rate_limit: {
          requests_per_minute: number;
        };
      };
    }
  | {
      service: 'hugging_face';
      service_settings: {
        api_key: string;
        url: string;
      };
    }
  | {
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
    }
  | {
      service: 'watsonxai';
      service_settings: {
        api_key: string;
        url: string;
        model_id: string;
        project_id: string;
        api_version: string;
      };
    }
  | {
      service: 'amazonbedrock';
      service_settings: {
        access_key: string;
        secret_key: string;
        region: string;
        provider: string;
        model: string;
      };
    };

export type InferenceAPIConfigResponse = InferenceInferenceEndpointInfo & InferenceServiceSettings;

export function isLocalModel(
  model: InferenceServiceSettings
): model is LocalInferenceServiceSettings {
  return ['elser', 'elasticsearch'].includes((model as LocalInferenceServiceSettings).service);
}

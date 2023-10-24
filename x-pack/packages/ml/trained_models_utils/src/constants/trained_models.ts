/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DEPLOYMENT_STATE = {
  STARTED: 'started',
  STARTING: 'starting',
  STOPPING: 'stopping',
} as const;

export type DeploymentState = typeof DEPLOYMENT_STATE[keyof typeof DEPLOYMENT_STATE];

export const TRAINED_MODEL_TYPE = {
  PYTORCH: 'pytorch',
  TREE_ENSEMBLE: 'tree_ensemble',
  LANG_IDENT: 'lang_ident',
} as const;
export type TrainedModelType = typeof TRAINED_MODEL_TYPE[keyof typeof TRAINED_MODEL_TYPE];

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
  typeof SUPPORTED_PYTORCH_TASKS[keyof typeof SUPPORTED_PYTORCH_TASKS];

export const BUILT_IN_MODEL_TYPE = i18n.translate(
  'xpack.ml.trainedModels.modelsList.builtInModelLabel',
  { defaultMessage: 'built-in' }
);

export const ELASTIC_MODEL_TYPE = 'elastic';

export const BUILT_IN_MODEL_TAG = 'prepackaged';

export const ELASTIC_MODEL_TAG = 'elastic';

export const ELSER_ID_V1 = '.elser_model_1' as const;

export const ELASTIC_MODEL_DEFINITIONS: Record<string, ModelDefinition> = Object.freeze({
  '.elser_model_1': {
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
  },
  '.elser_model_2': {
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
  },
  '.elser_model_2_linux-x86_64': {
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
  },
} as const);

export interface ModelDefinition {
  modelName: string;
  version: number;
  config: object;
  description: string;
  os?: string;
  arch?: string;
  default?: boolean;
  recommended?: boolean;
  hidden?: boolean;
}

export type ModelDefinitionResponse = Omit<ModelDefinition, 'modelName'> & {
  name: string;
};

export type ElasticModelId = keyof typeof ELASTIC_MODEL_DEFINITIONS;

export const MODEL_STATE = {
  ...DEPLOYMENT_STATE,
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  NOT_DOWNLOADED: 'notDownloaded',
} as const;

export type ModelState = typeof MODEL_STATE[keyof typeof MODEL_STATE] | null;

export type ElserVersion = 1 | 2;

export interface GetElserOptions {
  version?: ElserVersion;
}

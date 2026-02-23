/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  DEFAULT_ELSER,
  DEFAULT_E5_SMALL,
  DEFAULT_AI_ARTIFACT_INDEX_SETTINGS,
  getSemanticTextMapping,
  getAiArtifactIndexSettings,
  isSupportedInferenceId,
} from './index_settings';

export type {
  SupportedInferenceId,
  SemanticTextMapping,
  SemanticTextModelSettings,
  AiArtifactIndexConfig,
} from './index_settings';

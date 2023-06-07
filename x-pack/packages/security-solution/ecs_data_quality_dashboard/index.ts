/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DataQualityPanel } from './impl/data_quality';

export { getIlmPhaseDescription } from './impl/data_quality/helpers';

export {
  DATA_QUALITY_PROMPT_CONTEXT_PILL,
  DATA_QUALITY_PROMPT_CONTEXT_PILL_TOOLTIP,
  DATA_QUALITY_SUBTITLE,
  DATA_QUALITY_SUGGESTED_USER_PROMPT,
  ILM_PHASE,
  INDEX_LIFECYCLE_MANAGEMENT_PHASES,
  SELECT_ONE_OR_MORE_ILM_PHASES,
} from './impl/data_quality/translations';

export { ECS_REFERENCE_URL } from './impl/data_quality/data_quality_panel/index_properties/markdown/helpers';

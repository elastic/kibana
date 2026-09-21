/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  IMPACT_INDEX_NAME,
  IMPACT_INTERNAL_URL,
  IMPACT_UI_CAPABILITY_MANAGE,
  IMPACT_UI_CAPABILITY_SHOW,
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_IDS,
  MAX_ENTITY_NAME_LENGTH,
  MAX_IMPACT_CONVERSATION_IDS,
} from './constants';

export {
  attachImpactRequestSchema,
  getImpactQuerySchema,
  impactEntitiesSchema,
  impactEntitySchema,
  impactSchema,
} from './impact';

export type { AttachImpactRequest, GetImpactQuery, Impact, ImpactEntity } from './impact';

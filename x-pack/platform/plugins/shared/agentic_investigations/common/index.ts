/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  AGENTIC_INVESTIGATIONS_INTERNAL_URL,
  AGENTIC_INVESTIGATIONS_PLUGIN_ID,
} from './constants';

export { userSchema } from './user';
export type { User } from './user';

// Each entity this plugin owns keeps its own barrel; the umbrella re-exports
// them so consumers have a single entry point per the plugin's public surface.
export {
  IMPACT_INDEX_NAME,
  IMPACT_INTERNAL_URL,
  IMPACT_UI_CAPABILITY_MANAGE,
  IMPACT_UI_CAPABILITY_SHOW,
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_IDS,
  MAX_ENTITY_NAME_LENGTH,
  MAX_IMPACT_CONVERSATION_IDS,
  MAX_IMPACT_ID_LENGTH,
  attachImpactRequestSchema,
  getImpactQuerySchema,
  impactEntitiesSchema,
  impactEntitySchema,
  impactSchema,
} from './impact';

export type { AttachImpactRequest, GetImpactQuery, Impact, ImpactEntity } from './impact';

export {
  ESCALATION_BY_ID_URL,
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_TEMPLATE_ID,
  ESCALATIONS_INTERNAL_URL,
  ESCALATIONS_SUGGEST_USERS_URL,
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  INVESTIGATION_TEMPLATE_ID,
  MAX_ESCALATION_LINKED_INVESTIGATIONS,
  createEscalationRequestSchema,
  escalationVisibilitySchema,
  updateEscalationRequestSchema,
} from './escalations';

export type {
  CreateEscalationRequest,
  EscalationConversation,
  EscalationConversationSummary,
  EscalationVisibility,
  ListEscalationsResponse,
  UpdateEscalationRequest,
} from './escalations';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ESCALATION_BY_ID_URL,
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_TEMPLATE_ID,
  ESCALATIONS_INTERNAL_URL,
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  ESCALATIONS_UI_CAPABILITY_SHOW,
  INVESTIGATION_TEMPLATE_ID,
  MAX_ESCALATION_LINKED_INVESTIGATIONS,
  MAX_ESCALATIONS_PAGE_SIZE,
  MAX_ESCALATIONS_RESULT_WINDOW,
} from './constants';

export {
  createEscalationRequestSchema,
  escalationVisibilitySchema,
  listEscalationsQuerySchema,
  updateEscalationRequestSchema,
} from './escalation';

export type {
  CreateEscalationRequest,
  EscalationConversation,
  EscalationConversationSummary,
  EscalationVisibility,
  ListEscalationsQuery,
  ListEscalationsResponse,
  UpdateEscalationRequest,
} from './escalation';

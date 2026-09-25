/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ESCALATION_ASSIGNEES_FIELD,
  ESCALATION_ASSIGN_URL,
  ESCALATION_BY_ID_URL,
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_LINKED_INVESTIGATIONS_URL,
  ESCALATION_STATUS_FIELD,
  ESCALATION_TEMPLATE_ID,
  ESCALATIONS_INTERNAL_URL,
  ESCALATIONS_SUGGEST_USERS_URL,
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  ESCALATIONS_UI_CAPABILITY_SHOW,
  INVESTIGATION_TEMPLATE_ID,
  MAX_ESCALATION_ASSIGNEES,
  MAX_ESCALATION_LINKED_INVESTIGATIONS,
  MAX_ESCALATIONS_PAGE_SIZE,
  MAX_ESCALATIONS_RESULT_WINDOW,
} from './constants';

export {
  createEscalationRequestSchema,
  escalationStatusSchema,
  escalationVisibilitySchema,
  listEscalationsQuerySchema,
  updateEscalationRequestSchema,
} from './escalation';

export type {
  CreateEscalationRequest,
  EscalationConversation,
  EscalationConversationSummary,
  EscalationStatus,
  EscalationVisibility,
  LinkedInvestigationSummary,
  ListEscalationsQuery,
  ListEscalationsResponse,
  ListLinkedInvestigationsResponse,
  UpdateEscalationRequest,
} from './escalation';

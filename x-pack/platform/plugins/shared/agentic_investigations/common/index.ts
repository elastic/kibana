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
  SUGGEST_USER_PROFILES_URL,
} from './constants';

export { userSchema } from './user';
export type { User } from './user';

export {
  EVIDENCE_CHART_TYPES,
  EVIDENCE_CHART_X_AXIS_TYPES,
  EVIDENCE_CHART_Y_AXIS_UNITS,
  MAX_EVIDENCE_CHART_ANNOTATIONS,
  MAX_EVIDENCE_CHART_LABEL_LENGTH,
  MAX_EVIDENCE_CHART_POINTS,
  MAX_EVIDENCE_CHART_SERIES,
  MAX_EVIDENCE_SHORT_TEXT_LENGTH,
  MAX_EVIDENCE_TEXT_LENGTH,
  evidenceChartSchema,
  investigationEvidenceSchema,
} from './evidence';
export type {
  EvidenceChart,
  EvidenceChartAnnotation,
  EvidenceChartSeries,
  InvestigationEvidence,
} from './evidence';

export type {
  InvestigationAttachmentDocument,
  StoredInvestigationAttachment,
} from './investigation_attachments';

// Each entity this plugin owns keeps its own barrel; the umbrella re-exports
// them so consumers have a single entry point per the plugin's public surface.
export {
  IMPACT_ATTACHMENT_TYPE,
  IMPACT_INDEX_NAME,
  IMPACT_INTERNAL_URL,
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_IDS,
  MAX_ENTITY_NAME_LENGTH,
  MAX_IMPACT_CONVERSATION_IDS,
  MAX_IMPACT_ID_LENGTH,
  MAX_IMPACT_TOOL_ENTITIES,
  SET_IMPACT_TOOL_ID,
  attachImpactRequestSchema,
  getImpactQuerySchema,
  impactEntitiesSchema,
  impactEntitySchema,
  impactSchema,
  storedImpactEntitiesSchema,
} from './impact';

export type { AttachImpactRequest, GetImpactQuery, Impact, ImpactEntity } from './impact';

export {
  ESCALATION_ASSIGNEES_FIELD,
  ESCALATION_ASSIGN_URL,
  ESCALATION_BY_ID_URL,
  ESCALATION_CLOSE_PREVIEW_URL,
  ESCALATION_LINK_URL,
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_LINKED_INVESTIGATIONS_URL,
  ESCALATION_STATUS_FIELD,
  ESCALATION_STATUS_URL,
  ESCALATION_TEMPLATE_ID,
  ESCALATIONS_INTERNAL_URL,
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  ESCALATIONS_UI_CAPABILITY_SHOW,
  INVESTIGATION_TEMPLATE_ID,
  MAX_ESCALATION_ASSIGNEES,
  MAX_ESCALATION_LINKED_INVESTIGATIONS,
  MAX_ESCALATIONS_PAGE_SIZE,
  createEscalationRequestSchema,
  escalationStatusSchema,
  escalationVisibilitySchema,
  linkEscalationRequestSchema,
  listEscalationsQuerySchema,
} from './escalations';

export {
  INVESTIGATION_ASSIGN_URL,
  INVESTIGATION_CLOSE_PREVIEW_URL,
  INVESTIGATION_STATUS_URL,
  INVESTIGATIONS_INTERNAL_URL,
  INVESTIGATIONS_PRIVILEGES_URL,
  INVESTIGATIONS_UI_CAPABILITY_MANAGE,
  INVESTIGATIONS_UI_CAPABILITY_SHOW,
} from './investigations/constants';
export type {
  InvestigationsPrivilegesResponse,
  ReadManagePrivileges,
} from './investigations/privileges';

export {
  setInvestigationStatusRequestSchema,
  setEscalationStatusRequestSchema,
} from './investigations/status';

export type {
  SetInvestigationStatusRequest,
  SetInvestigationStatusResponse,
  InvestigationClosePreviewResponse,
  ClosePreviewProposal,
  SetEscalationStatusRequest,
  SetEscalationStatusResponse,
  EscalationClosePreviewResponse,
} from './investigations/status';

export {
  assignConversationRequestBodySchema,
  assignConversationRequestParamsSchema,
} from './assignments/assignment';
export type { AssignConversationRequest } from './assignments/assignment';

export type {
  CreateEscalationRequest,
  EscalationConversation,
  EscalationConversationSummary,
  EscalationStatus,
  EscalationVisibility,
  LinkEscalationRequest,
  LinkedInvestigationSummary,
  ListEscalationsQuery,
  ListEscalationsResponse,
  ListLinkedInvestigationsResponse,
} from './escalations';

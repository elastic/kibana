/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { defaultAssistantFeatures } from './impl/capabilities';
export type { AssistantFeatures } from './impl/capabilities';

export { getAnonymizedValue } from './impl/data_anonymization/get_anonymized_value';

export {
  getIsDataAnonymizable,
  isAllowed,
  isAnonymized,
  isDenied,
  replaceAnonymizedValuesWithOriginalValues,
  replaceOriginalValuesWithUuidValues,
} from './impl/data_anonymization/helpers';

export {
  newContentReferencesStore,
  securityAlertReference,
  knowledgeBaseReference,
  securityAlertsPageReference,
  productDocumentationReference,
  esqlQueryReference,
  contentReferenceString,
  contentReferenceBlock,
  removeContentReferences,
  pruneContentReferences,
  enrichDocument,
  sanitizeMessages,
} from './impl/content_references';

export type {
  ContentReferencesStore,
  ContentReferenceBlock,
} from './impl/content_references/types';

export { transformRawData } from './impl/data_anonymization/transform_raw_data';
export { parseBedrockBuffer, handleBedrockChunk } from './impl/utils/bedrock';
export {
  getIsConversationOwner,
  getCurrentConversationOwner,
  getConversationSharedState,
  ConversationSharedState,
} from './impl/utils/sharing_helpers';

export * from './constants';

/** currently the same shape as "fields" property in the ES response */
export { type MaybeRawData } from './impl/alerts/helpers/types';

/** export Attack Discovery Alert Document type */
export type { AttackDiscoveryAlertDocument } from './impl/schedules/types';

/**
 * This query returns open and acknowledged (non-building block) alerts in the last 24 hours.
 *
 * The alerts are ordered by risk score, and then from the most recent to the oldest.
 */
export { getOpenAndAcknowledgedAlertsQuery } from './impl/alerts/get_open_and_acknowledged_alerts_query';

/** Returns the raw data if it valid, or a default if it's not */
export { getRawDataOrDefault } from './impl/alerts/helpers/get_raw_data_or_default';

/** Return true if the provided size is out of range */
export { sizeIsOutOfRange } from './impl/alerts/helpers/size_is_out_of_range';

export {
  /** The default (relative) end of the date range (i.e. `now`) */
  DEFAULT_END,
  /** The default (relative) start of the date range (i.e. `now-24h`) */
  DEFAULT_START,
} from './impl/alerts/get_open_and_acknowledged_alerts_query';

export { getAttackDiscoveryLoadingMessage } from './impl/utils/get_attack_discovery_loading_message';

export {
  getAttackChainMarkdown,
  getAttackDiscoveryMarkdown,
  getAttackDiscoveryMarkdownFields,
  getMarkdownFields,
  getMarkdownWithOriginalValues,
} from './impl/utils/get_attack_discovery_markdown';

export {
  getOriginalAlertIds,
  getTacticLabel,
  getTacticMetadata,
  replaceNewlineLiterals,
  transformInternalReplacements,
} from './impl/utils/attack_discovery_helpers';

export * from './impl/schedules/field_names';

export { transformAttackDiscoveryAlertFromApi } from './impl/utils/transform_attack_discovery_alert_from_api';
export { transformAttackDiscoveryAlertToApi } from './impl/utils/transform_attack_discovery_alert_to_api';
export { transformAttackDiscoveryAlertDocumentToApi } from './impl/utils/transform_search_response_to_alerts/transform_attack_discovery_alert_document_to_api';
export { transformAttackDiscoveryScheduleFromApi } from './impl/utils/transform_attack_discovery_schedule_from_api';
export { transformSearchResponseToAlerts } from './impl/utils/transform_search_response_to_alerts';

export * from './impl/connectors/outdated_connectors';
export { transformAttackDiscoveryScheduleToApi } from './impl/utils/transform_attack_discovery_schedule_to_api';
export { transformAttackDiscoveryScheduleCreatePropsToApi } from './impl/utils/transform_attack_discovery_schedule_create_props_to_api';
export { transformAttackDiscoveryScheduleUpdatePropsToApi } from './impl/utils/transform_attack_discovery_schedule_update_props_to_api';
export { transformAttackDiscoveryScheduleCreatePropsFromApi } from './impl/utils/transform_attack_discovery_schedule_create_props_from_api';
export { transformAttackDiscoveryScheduleUpdatePropsFromApi } from './impl/utils/transform_attack_discovery_schedule_update_props_from_api';

// ─── Explicit schema type re-exports (replaces removed `export * from './impl/schemas'`) ───
// These use the pure-TypeScript `types/` gen files (no Zod at runtime) so importing from
// the root package no longer eagerly loads all Zod schemas.

// Common attributes
export type { User, ScreenContext, PromptIds } from './types/common_attributes.gen';

// Conversations — common attributes
export type {
  ApiConfig,
  ConversationCategory,
  ConversationCreateProps,
  ConversationResponse,
  ConversationUpdateProps,
  InterruptResumeValue,
  Message,
  MessageMetadata,
  MessageRole,
  Replacements,
} from './types/conversations/common_attributes.gen';

// Conversations — runtime enum (value, not just type)
export { ProviderEnum } from './impl/schemas/conversations/common_attributes.gen';

// Conversations — crud routes
export type { DeleteAllConversationsResponse } from './types/conversations/crud_conversation_route.gen';

// Anonymization fields
export type { FindAnonymizationFieldsResponse } from './types/anonymization_fields/find_anonymization_fields_route.gen';

// Capabilities
export type { GetCapabilitiesResponse } from './types/capabilities/get_capabilities_route.gen';

// Evaluation
export type { GetEvaluateResponse } from './types/evaluation/get_evaluate_route.gen';
// PostEvaluateRequestBodyInput uses z.input<> which makes optional-with-default fields
// optional in input — use the impl/schemas type to preserve that behaviour.
export type { PostEvaluateRequestBodyInput } from './impl/schemas/evaluation/post_evaluate_route.gen';
export type { PostEvaluateResponse } from './types/evaluation/post_evaluate_route.gen';

// Prompts
export type { PromptResponse } from './types/prompts/bulk_crud_prompts_route.gen';
export type { FindPromptsResponse } from './types/prompts/find_prompts_route.gen';

// Prompts — runtime enum (value)
export { PromptTypeEnum } from './impl/schemas/prompts/bulk_crud_prompts_route.gen';

// Security AI prompts
// FindSecurityAIPromptsRequestQuery uses z.infer<> (type alias, not interface) so it is
// assignable to HttpFetchQuery — must be exported from impl/schemas, not types/.
export type { FindSecurityAIPromptsRequestQuery } from './impl/schemas/security_ai_prompts/find_prompts_route.gen';
export type { FindSecurityAIPromptsResponse } from './types/security_ai_prompts/find_prompts_route.gen';

// Defend insights — DefendInsightType and DefendInsightStatusEnum are used as Zod schema
// runtime values (.enum accessor); DefendInsight is type-only.
export {
  DefendInsightType,
  DefendInsightStatusEnum,
} from './impl/schemas/defend_insights/common_attributes.gen';
export type { DefendInsight } from './types/defend_insights/common_attributes.gen';

// Users
export type { SuggestUsersResponse } from './types/users/suggest_route.gen';

// Knowledge base
// CreateKnowledgeBaseRequestParams and ReadKnowledgeBaseRequestParams are Zod schemas
// used as runtime values with buildRouteValidationWithZod — must be value exports.
export {
  CreateKnowledgeBaseRequestParams,
  ReadKnowledgeBaseRequestParams,
} from './impl/schemas/knowledge_base/overrides.gen_overrides';
export type {
  CreateKnowledgeBaseResponse,
  ReadKnowledgeBaseResponse,
} from './types/knowledge_base/crud_kb_route.gen';

// DocumentEntryType, IndexEntryType, KnowledgeBaseEntryCreateProps, KnowledgeBaseEntryResponse
// are used as runtime Zod schema values (e.g. `.value`, `.parse`) — must be value exports.
export {
  DocumentEntryType,
  IndexEntryType,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
} from './impl/schemas/knowledge_base/entries/common_attributes.gen';
// DocumentEntry and IndexEntry use z.infer<> (type alias, not interface); also,
// namespace is required in the Zod-inferred type (BaseDefaultableFields.required()) which
// matches KnowledgeBaseEntryResponse — must come from impl/schemas.
export type {
  DocumentEntry,
  IndexEntry,
} from './impl/schemas/knowledge_base/entries/common_attributes.gen';

export type {
  KnowledgeBaseEntryBulkActionBase,
  KnowledgeBaseEntryBulkCrudActionResponse,
  PerformKnowledgeBaseEntryBulkActionRequestBody,
} from './types/knowledge_base/entries/bulk_crud_knowledge_base_entries_route.gen';

// FindKnowledgeBaseEntriesRequestQuery uses z.infer<> (type alias, not interface) so it is
// assignable to HttpFetchQuery — must be exported from impl/schemas, not types/.
// FindKnowledgeBaseEntriesResponse must also come from impl/schemas so its embedded
// KnowledgeBaseEntryResponse is structurally consistent with the root export (namespace required).
export type {
  FindKnowledgeBaseEntriesRequestQuery,
  FindKnowledgeBaseEntriesResponse,
} from './impl/schemas/knowledge_base/entries/find_knowledge_base_entries_route.gen';

// Attack Discovery
export type {
  AttackDiscovery,
  AttackDiscoveryStatus,
  AttackDiscoveryStats,
} from './types/attack_discovery/common_attributes.gen';

export type { PostAttackDiscoveryGenerateRequestBody } from './types/attack_discovery/routes/public/post/post_attack_discovery_generate.gen';
// PostAttackDiscoveryGenerateResponse is used as a Zod schema value (.safeParse) — must be a value export.
export { PostAttackDiscoveryGenerateResponse } from './impl/schemas/attack_discovery/routes/public/post/post_attack_discovery_generate.gen';

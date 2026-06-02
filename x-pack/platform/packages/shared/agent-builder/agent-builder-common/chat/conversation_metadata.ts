/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Known {@link TemplateSnapshot.profile} values for {@link ConversationTemplate}.
 * Custom template authors may use other profile strings.
 */
export type ConversationTemplateProfile =
  | 'general'
  | 'incident'
  | 'hunt'
  | 'investigation'
  | 'observability';

/**
 * Immutable snapshot of the {@link ConversationTemplate} at conversation create time.
 * **B2:** persisted on the conversation when create-from-template ships; not in B0.
 */
export interface TemplateSnapshot {
  template_id: string;
  /** e.g. incident, hunt, observability — see {@link ConversationTemplateProfile}. */
  profile?: ConversationTemplateProfile | string;
  captured_at: string;
}

/**
 * Structured workspace metadata on a conversation (B0).
 *
 * Domain-neutral: incident triage, threat hunt, observability RCA, or general
 * structured chat all use the same fields; {@link ConversationTemplate.profile}
 * defines the workspace shape (via `template_id` once B2 templates exist).
 *
 * Pinned evidence and cross-thread links use VersionedAttachment extensions
 * (`pinned`, new attachment types) — not a separate metadata array.
 *
 * Chat activity uses #259692 `TimelineEvent[]` / `TimelineConversation.timeline`
 * — not fields on this interface.
 *
 * @see docs/agent_builder_option_b_259692_integration.md
 */
export interface ConversationMetadataFields {
  template_id?: string;
  custom_fields?: Record<string, unknown>;
}

/** Metadata (+ title) updatable via PATCH without touching rounds/timeline. */
export type ConversationMetadataUpdate = Partial<
  Pick<ConversationMetadataFields, 'template_id' | 'custom_fields'>
>;

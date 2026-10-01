/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  defineInvestigationAttachment,
  type InvestigationAttachmentConfig,
  type InvestigationAttachmentDefinition,
  type InvestigationAttachmentTypeDeps,
  type InvestigationAttachmentWrite,
} from './define_investigation_attachment';
export {
  InvestigationAttachmentDocService,
  MAX_INVESTIGATION_ATTACHMENT_CONVERSATION_IDS,
  MAX_INVESTIGATION_ATTACHMENT_ID_LENGTH,
  type InvestigationAttachmentStorage,
  type WrittenInvestigationAttachment,
} from './attachment_doc_service';
export { attachWithPublicClient } from './attach_with_public_client';
export {
  createConversationReadCheck,
  type AssertCanReadConversation,
} from './assert_can_read_conversation';
export {
  attachFromTool,
  type AttachedFromTool,
  type ToolAttachmentOutcome,
} from './attach_from_tool';
export { createInvestigationTool, getToolConversationId } from './create_investigation_tool';
export { formatEvidenceForAgent } from './format_evidence';
export { hashInvestigationAttachmentId } from './doc_id';
export { withTransientSearchRetry } from './search_with_transient_retry';
export {
  InvestigationAttachmentConflictError,
  InvestigationAttachmentInvalidRequestError,
} from './errors';

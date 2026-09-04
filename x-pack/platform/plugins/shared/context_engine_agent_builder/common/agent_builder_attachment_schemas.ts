/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  aiIndexAttachmentDataSchema,
  type AiIndexAttachmentData,
} from '@kbn/context-engine-plugin/common/ai_index_schemas';
import type { AI_INDEX_ATTACHMENT_TYPE } from './agent_builder_attachments';

export { aiIndexAttachmentDataSchema, type AiIndexAttachmentData };

export type AiIndexAttachment = Attachment<typeof AI_INDEX_ATTACHMENT_TYPE, AiIndexAttachmentData>;

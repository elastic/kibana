/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { aiIndexAttachmentDataSchema, type AiIndexAttachmentData } from './ai_index_schemas';

export { aiIndexAttachmentDataSchema, type AiIndexAttachmentData };

export const AI_INDEX_ATTACHMENT_TYPE = 'platform.context_engine.ai_index' as const;

export const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml' as const;

export type AiIndexAttachment = Attachment<typeof AI_INDEX_ATTACHMENT_TYPE, AiIndexAttachmentData>;

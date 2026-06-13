/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { InvestigationResult } from '@kbn/streams-schema';

export const INVESTIGATION_ATTACHMENT_TYPE = 'platform.streams.investigation' as const;

export type InvestigationAttachment = Attachment<
  typeof INVESTIGATION_ATTACHMENT_TYPE,
  InvestigationResult
>;

export type PendingInvestigationAttachment = AttachmentInput<
  typeof INVESTIGATION_ATTACHMENT_TYPE,
  InvestigationResult
>;

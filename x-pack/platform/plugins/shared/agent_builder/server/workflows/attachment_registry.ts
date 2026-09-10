/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { AttachmentPublicClient } from '@kbn/agent-builder-server';
import { addAttachmentStepDefinition } from './steps/attachment_add';
import { updateAttachmentStepDefinition } from './steps/attachment_update';
import { deleteAttachmentStepDefinition } from './steps/attachment_delete';
import { readAttachmentStepDefinition } from './steps/attachment_read';
import { listAttachmentsStepDefinition } from './steps/attachment_list';

export interface AttachmentStepDeps {
  getAttachmentClient: (request: KibanaRequest) => Promise<AttachmentPublicClient>;
  isExperimentalEnabled: (request: KibanaRequest) => Promise<boolean>;
}

type AttachmentStepFactory = (deps: AttachmentStepDeps) => ServerStepDefinition;

/**
 * Single source of truth for all agent-builder attachment workflow steps.
 * Adding a new step here registers it in the workflow engine automatically.
 */
export const attachmentStepRegistry: AttachmentStepFactory[] = [
  addAttachmentStepDefinition,
  updateAttachmentStepDefinition,
  deleteAttachmentStepDefinition,
  readAttachmentStepDefinition,
  listAttachmentsStepDefinition,
];

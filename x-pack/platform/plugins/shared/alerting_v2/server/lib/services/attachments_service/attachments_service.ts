/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { injectable } from 'inversify';
import { createAttachmentsClient, type AttachmentsClient } from './attachments_client';

export interface AttachmentsServiceContract {
  /** Returns a typed client over the conversation attachments of the current tool call. */
  getClient(attachments: AttachmentStateManager): AttachmentsClient;
}

/**
 * Agent Builder attachment state is scoped to a single tool call and is not
 * available in the DI container, so this service is a singleton factory that
 * wraps the state manager handed to each tool handler.
 */
@injectable()
export class AttachmentsService implements AttachmentsServiceContract {
  public getClient(attachments: AttachmentStateManager): AttachmentsClient {
    return createAttachmentsClient(attachments);
  }
}

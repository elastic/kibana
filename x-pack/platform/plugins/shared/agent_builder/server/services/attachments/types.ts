/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentInput,
  AttachmentRefActor,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentStateManager,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import type { KibanaRequest } from '@kbn/core-http-server';

export interface AttachmentServiceSetup {
  registerType(attachmentType: AttachmentTypeDefinition): void;
}

export interface AttachmentServiceStart {
  validate(
    attachments: AttachmentInput[] | undefined,
    request: KibanaRequest
  ): Promise<AttachmentInput[] | undefined>;
  getTypeDefinition(type: string): AttachmentTypeDefinition | undefined;
  getRegisteredTypeIds(): string[];
  createStateManager(attachments: VersionedAttachment[]): AttachmentStateManager;
  mergeInputs(options: {
    stateManager: AttachmentStateManager;
    inputs: AttachmentInput[];
    request: KibanaRequest;
    actor: AttachmentRefActor;
    updateOriginSnapshot?: boolean;
  }): Promise<void>;
}

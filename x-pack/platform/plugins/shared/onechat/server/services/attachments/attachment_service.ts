/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAttachmentTypeRegistry,
  type AttachmentTypeRegistry,
} from './attachment_type_registry';
import type { AttachmentServiceSetup, AttachmentServiceStart } from './types';

export interface AttachmentService {
  setup: () => AttachmentServiceSetup;
  start: () => AttachmentServiceStart;
}

export const createAttachmentService = (): AttachmentService => {
  return new AttachmentServiceImpl();
};

export class AttachmentServiceImpl implements AttachmentService {
  readonly attachmentTypeRegistry: AttachmentTypeRegistry;

  constructor() {
    this.attachmentTypeRegistry = createAttachmentTypeRegistry();
  }

  setup(): AttachmentServiceSetup {
    return {
      register: (attachmentType) => this.attachmentTypeRegistry.register(attachmentType),
    };
  }

  start(): AttachmentServiceStart {
    return {};
  }
}

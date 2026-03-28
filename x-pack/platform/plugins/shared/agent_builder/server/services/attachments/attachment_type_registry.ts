/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

export interface AttachmentTypeRegistry {
  register<TType extends string, TContent>(
    attachmentType: AttachmentTypeDefinition<TType, TContent>
  ): void;
  has(attachmentTypeId: string): boolean;
  get(attachmentTypeId: string): AttachmentTypeDefinition | undefined;
  list(): AttachmentTypeDefinition[];
}

export const createAttachmentTypeRegistry = (): AttachmentTypeRegistry => {
  return new AttachmentTypeRegistryImpl();
};

class AttachmentTypeRegistryImpl implements AttachmentTypeRegistry {
  private attachmentTypes: Map<string, AttachmentTypeDefinition> = new Map();

  constructor() {}

  register<TType extends string, TContent>(type: AttachmentTypeDefinition<TType, TContent>) {
    if (this.attachmentTypes.has(type.id)) {
      throw new Error(`Attachment type with id ${type.id} already registered`);
    }
    this.attachmentTypes.set(type.id, type as AttachmentTypeDefinition);
  }

  has(toolId: string): boolean {
    return this.attachmentTypes.has(toolId);
  }

  get(toolId: string) {
    return this.attachmentTypes.get(toolId);
  }

  list() {
    return [...this.attachmentTypes.values()];
  }
}

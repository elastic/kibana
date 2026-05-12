/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getCurrentSpaceId } from '../../utils/spaces';
import {
  createAttachmentTypeRegistry,
  type AttachmentTypeRegistry,
} from './attachment_type_registry';
import type { AttachmentServiceSetup, AttachmentServiceStart } from './types';
import { validateAttachment } from './validate_attachment';

export interface AttachmentServiceStartDeps {
  spaces?: SpacesPluginStart;
  savedObjects: SavedObjectsServiceStart;
}

export interface AttachmentService {
  setup: () => AttachmentServiceSetup;
  start: (deps: AttachmentServiceStartDeps) => AttachmentServiceStart;
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
      registerType: (attachmentType) => this.attachmentTypeRegistry.register(attachmentType),
    };
  }

  start(deps: AttachmentServiceStartDeps): AttachmentServiceStart {
    return {
      validate: (attachment, request) => {
        const resolveContext = {
          request,
          spaceId: getCurrentSpaceId({ request, spaces: deps.spaces }),
          savedObjectsClient: deps.savedObjects.getScopedClient(request),
        };
        return validateAttachment({
          attachment,
          registry: this.attachmentTypeRegistry,
          resolveContext,
        });
      },
      getTypeDefinition: (attachment) => {
        return this.attachmentTypeRegistry.get(attachment);
      },
      getRegisteredTypeIds: () => {
        return this.attachmentTypeRegistry.list().map((def) => def.id);
      },
    };
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { isAllowedBuiltinAttachment } from '@kbn/agent-builder-server/allow_lists';
import { getCurrentSpaceId } from '../../utils/spaces';
import {
  createAttachmentTypeRegistry,
  type AttachmentTypeRegistry,
} from './attachment_type_registry';
import type { AttachmentServiceSetup, AttachmentServiceStart } from './types';
import { validateAttachments } from './validate_attachment';
import { mergeAttachmentInputs } from './merge_attachment_inputs';

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
      registerType: (attachmentType) => {
        if (!isAllowedBuiltinAttachment(attachmentType.id)) {
          throw new Error(
            `Built-in attachment with id "${attachmentType.id}" is not in the list of allowed built-in attachments.
             Please add it to the list of allowed built-in attachments in the "@kbn/agent-builder-server/allow_lists.ts" file.`
          );
        }
        return this.attachmentTypeRegistry.register(attachmentType);
      },
    };
  }

  start(deps: AttachmentServiceStartDeps): AttachmentServiceStart {
    const resolveContext = (request: KibanaRequest): AttachmentResolveContext => ({
      request,
      spaceId: getCurrentSpaceId({ request, spaces: deps.spaces }),
      savedObjectsClient: deps.savedObjects.getScopedClient(request),
    });

    return {
      validate: (attachments, request) => {
        return validateAttachments({
          attachments,
          registry: this.attachmentTypeRegistry,
          resolveContext: resolveContext(request),
        });
      },
      createStateManager: (attachments) =>
        createAttachmentStateManager(attachments, {
          getTypeDefinition: (type) => this.attachmentTypeRegistry.get(type),
        }),
      mergeInputs: ({ stateManager, inputs, request, actor, updateOriginSnapshot }) =>
        mergeAttachmentInputs({
          stateManager,
          inputs,
          actor,
          updateOriginSnapshot,
          resolveContext: resolveContext(request),
        }),
      getTypeDefinition: (attachment) => {
        return this.attachmentTypeRegistry.get(attachment);
      },
      getRegisteredTypeIds: () => {
        return this.attachmentTypeRegistry.list().map((def) => def.id);
      },
    };
  }
}

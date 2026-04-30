/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentContextLayerPluginStart } from '@kbn/agent-context-layer-plugin/server';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { AttachmentServiceStart } from './types';
import { validateAttachment } from './validate_attachment';

export interface AttachmentServiceStartDeps {
  spaces?: SpacesPluginStart;
  savedObjects: SavedObjectsServiceStart;
  agentContextLayer: AgentContextLayerPluginStart;
}

export interface AttachmentService {
  start: (deps: AttachmentServiceStartDeps) => AttachmentServiceStart;
}

export const createAttachmentService = (): AttachmentService => {
  return new AttachmentServiceImpl();
};

export class AttachmentServiceImpl implements AttachmentService {
  start(deps: AttachmentServiceStartDeps): AttachmentServiceStart {
    const resolverLookup = {
      has: (typeId: string) => deps.agentContextLayer.hasResolverType(typeId),
      get: (typeId: string) => deps.agentContextLayer.getResolverType(typeId),
    };

    return {
      validate: (attachment, request) => {
        const resolveContext = {
          request,
          spaceId: getCurrentSpaceId({ request, spaces: deps.spaces }),
          savedObjectsClient: deps.savedObjects.getScopedClient(request),
        };
        return validateAttachment({
          attachment,
          resolverLookup,
          resolveContext,
        });
      },
      getTypeDefinition: (type: string) => deps.agentContextLayer.getResolverType(type),
      getRegisteredTypeIds: () => deps.agentContextLayer.listResolverTypes().map((def) => def.id),
    };
  }
}

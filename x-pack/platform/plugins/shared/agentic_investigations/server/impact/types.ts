/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import type { ResolveUser } from '../services/resolve_user';
import type { ImpactService } from './services/impact_service';

export interface ImpactRouteDependencies {
  router: IRouter;
  logger: Logger;
  getImpactService: () => ImpactService;
  getSpaceId: (request: KibanaRequest) => string;
  resolveUser: ResolveUser;
  getAttachmentClient: (request: KibanaRequest) => Promise<AttachmentPublicClient>;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { OnechatInternalService } from '../services';

export interface EmbeddableConversationDependencies {
  services: OnechatInternalService;
  coreStart: CoreStart;
}

export interface EmbeddableConversationProps {
  /**
   * Optional conversation ID to load an existing conversation.
   * If not provided, a new conversation will be started.
   */
  conversationId?: string;
}

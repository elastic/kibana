/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { OnechatInternalService } from '../services';
import { EmbeddableConversationInternal } from './embeddable_conversation';
import type { EmbeddableConversationProps } from './types';

interface CreateEmbeddableConversationParams {
  services: OnechatInternalService;
  coreStart: CoreStart;
}

/**
 * Factory function that creates an embeddable Conversation component
 * with services injected via closure.
 *
 * @param services - Internal onechat services
 * @param coreStart - Kibana core start services
 * @returns A configured Conversation component ready for external consumption
 */
export const createEmbeddableConversation = ({
  services,
  coreStart,
}: CreateEmbeddableConversationParams): React.ComponentType<EmbeddableConversationProps> => {
  return (props: EmbeddableConversationProps) => (
    <EmbeddableConversationInternal {...props} services={services} coreStart={coreStart} />
  );
};


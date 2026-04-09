/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EmbeddableConversationInternal } from './embeddable_conversation';
import type {
  EmbeddableConversationDependencies,
  EmbeddableConversationSidebarProps,
  EmbeddableConversationProps,
} from './types';

/**
 * Factory function that creates an embeddable Conversation component
 * with services injected via closure.
 *
 * @param services - Internal agentBuilder services
 * @param coreStart - Kibana core start services
 * @returns A configured Conversation component ready for external consumption
 */
export const createEmbeddableConversation = ({
  services,
  coreStart,
}: EmbeddableConversationDependencies): React.FC<
  EmbeddableConversationProps & EmbeddableConversationSidebarProps
> => {
  return (props: EmbeddableConversationProps & EmbeddableConversationSidebarProps) => (
    <EmbeddableConversationInternal {...props} coreStart={coreStart} services={services} />
  );
};

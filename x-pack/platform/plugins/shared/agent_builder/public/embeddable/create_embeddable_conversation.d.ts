import React from 'react';
import type { EmbeddableConversationDependencies, EmbeddableConversationSidebarProps, EmbeddableConversationProps } from './types';
/**
 * Factory function that creates an embeddable Conversation component
 * with services injected via closure.
 *
 * @param services - Internal agentBuilder services
 * @param coreStart - Kibana core start services
 * @returns A configured Conversation component ready for external consumption
 */
export declare const createEmbeddableConversation: ({ services, coreStart, }: EmbeddableConversationDependencies) => React.FC<EmbeddableConversationProps & EmbeddableConversationSidebarProps>;

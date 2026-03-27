/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EmbeddableConversationInputInternal } from './embeddable_conversation_input';
import type { EmbeddableConversationDependencies, EmbeddableConversationProps } from './types';

/**
 * Factory function that creates a standalone ConversationInput component
 * with services injected via closure. Renders only the input form — no
 * flyout chrome or message history panel.
 */
export const createEmbeddableConversationInput = ({
  services,
  coreStart,
}: EmbeddableConversationDependencies): React.FC<EmbeddableConversationProps> => {
  return (props: EmbeddableConversationProps) => (
    <EmbeddableConversationInputInternal {...props} coreStart={coreStart} services={services} />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EmbeddableConversationInternalProps } from './types';
import { EmbeddableConversationProvider } from '../application/context/conversation/embeddable_conversation_provider';
import { Conversation } from '../application/components/conversations/conversation';

export const EmbeddableConversationInternal: React.FC<EmbeddableConversationInternalProps> = (
  props
) => {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <EmbeddableConversationProvider {...props}>
        <Conversation />
      </EmbeddableConversationProvider>
    </div>
  );
};

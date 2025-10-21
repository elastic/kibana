/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Conversation } from '../application/components/conversations/conversation';
import { SendMessageProvider } from '../application/context/send_message/send_message_context';
import type { EmbeddableConversationDependencies, EmbeddableConversationProps } from './types';

const queryClient = new QueryClient();
const history = createMemoryHistory();

type EmbeddableConversationInternalProps = EmbeddableConversationDependencies &
  EmbeddableConversationProps;

export const EmbeddableConversationInternal: React.FC<EmbeddableConversationInternalProps> = ({
  coreStart,
  services,
  conversationId,
}) => {
  const kibanaServices = useMemo(
    () => ({
      ...coreStart,
      plugins: services.startDependencies,
    }),
    [coreStart, services.startDependencies]
  );

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <KibanaContextProvider services={kibanaServices}>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <Router history={history}>
              <SendMessageProvider>
                <Conversation />
              </SendMessageProvider>
            </Router>
          </QueryClientProvider>
        </I18nProvider>
      </KibanaContextProvider>
    </div>
  );
};

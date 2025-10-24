/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EmbeddableConversationInternalProps } from '../../../embeddable/types';
import { ConversationContext } from './conversation_context';
import { OnechatServicesContext } from '../onechat_services_context';
import { SendMessageProvider } from '../send_message/send_message_context';

const queryClient = new QueryClient();

interface EmbeddableConversationProviderProps extends EmbeddableConversationInternalProps {
  children: React.ReactNode;
}

export const EmbeddableConversationProvider: React.FC<EmbeddableConversationProviderProps> = ({
  children,
  coreStart,
  services,
  ...contextProps
}) => {
  const kibanaServices = useMemo(
    () => ({
      ...coreStart,
      plugins: services.startDependencies,
    }),
    [coreStart, services.startDependencies]
  );

  const { conversationId } = contextProps;

  const conversationContextValue = useMemo(
    () => ({ conversationId, shouldStickToBottom: true }),
    [conversationId]
  );

  return (
    <KibanaContextProvider services={kibanaServices}>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <OnechatServicesContext.Provider value={services}>
            <SendMessageProvider>
              <ConversationContext.Provider value={conversationContextValue}>
                {children}
              </ConversationContext.Provider>
            </SendMessageProvider>
          </OnechatServicesContext.Provider>
        </QueryClientProvider>
      </I18nProvider>
    </KibanaContextProvider>
  );
};

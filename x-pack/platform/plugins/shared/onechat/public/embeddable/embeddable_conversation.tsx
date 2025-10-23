/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { SendMessageProvider } from '../application/context/send_message/send_message_context';
import { OnechatServicesContext } from '../application/context/onechat_services_context';
import type { EmbeddableConversationDependencies, EmbeddableConversationProps } from './types';
import { EmbeddableConversationProvider } from '../application/providers/embeddable_conversation_provider';
import { Conversation } from '../application/components/conversations/conversation';

const queryClient = new QueryClient();

type EmbeddableConversationInternalProps = EmbeddableConversationDependencies &
  EmbeddableConversationProps;

export const EmbeddableConversationInternal: React.FC<EmbeddableConversationInternalProps> = ({
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

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <KibanaContextProvider services={kibanaServices}>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <OnechatServicesContext.Provider value={services}>
              <SendMessageProvider>
                <EmbeddableConversationProvider {...contextProps}>
                  <Conversation />
                </EmbeddableConversationProvider>
              </SendMessageProvider>
            </OnechatServicesContext.Provider>
          </QueryClientProvider>
        </I18nProvider>
      </KibanaContextProvider>
    </div>
  );
};

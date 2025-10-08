/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @jsx jsx */
import { jsx } from '@emotion/react';
import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import { css } from '@emotion/react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import type { OnechatInternalService } from '../services';
import { OnechatServicesContext } from '../application/context/onechat_services_context';
import { SendMessageProvider } from '../application/context/send_message/send_message_context';
import { ConversationIdProvider } from '../application/context/conversation_id_context';
import { EmbeddableModeProvider } from '../application/context/embeddable_mode_context';
import { Conversation } from '../application/components/conversations/conversation';
import { useEmbeddableConversationState } from './hooks/use_embeddable_conversation_state';
import type { EmbeddableConversationProps } from './types';

interface EmbeddableConversationInternalProps extends EmbeddableConversationProps {
  services: OnechatInternalService;
  coreStart: CoreStart;
}

const EmbeddableConversationInternal: React.FC<EmbeddableConversationInternalProps> = ({
  conversationId: initialConversationId,
  agentId,
  height = '600px',
  onConversationCreated,
  className,
  services,
  coreStart,
}) => {
  // Create a new QueryClient instance for this embeddable
  const queryClient = useMemo(() => new QueryClient(), []);

  // Create a memory history for the router
  const history = useMemo(() => createMemoryHistory(), []);

  // Manage conversation ID state
  const { conversationId, setConversationId } = useEmbeddableConversationState({
    initialConversationId,
    onConversationCreated,
  });

  // Prepare Kibana services context
  const kibanaServices = useMemo(
    () => ({
      ...coreStart,
      plugins: services.startDependencies,
    }),
    [coreStart, services.startDependencies]
  );

  // Container styles
  const containerHeight = typeof height === 'number' ? `${height}px` : height;
  const containerStyles = css`
    height: ${containerHeight};
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  return (
    <div css={containerStyles} className={className}>
      <KibanaContextProvider services={kibanaServices}>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <OnechatServicesContext.Provider value={services}>
              <Router history={history}>
                <EmbeddableModeProvider
                  isEmbeddedMode={true}
                  onConversationCreated={setConversationId}
                >
                  <ConversationIdProvider conversationId={conversationId}>
                    <SendMessageProvider>
                      <Conversation />
                    </SendMessageProvider>
                  </ConversationIdProvider>
                </EmbeddableModeProvider>
              </Router>
            </OnechatServicesContext.Provider>
          </QueryClientProvider>
        </I18nProvider>
      </KibanaContextProvider>
    </div>
  );
};

export { EmbeddableConversationInternal };

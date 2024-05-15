/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AssistantAvatar, useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { EuiButton } from '@elastic/eui';
import { css } from '@emotion/react';
import { v4 } from 'uuid';
import useObservable from 'react-use/lib/useObservable';
import { useObservabilityAIAssistantAppService } from '../../hooks/use_observability_ai_assistant_app_service';
import { ChatFlyout } from '../chat/chat_flyout';
import { useKibana } from '../../hooks/use_kibana';
import { useIsNavControlVisible } from '../../hooks/is_nav_control_visible';
import { useTheme } from '../../hooks/use_theme';
import { useNavControlScreenContext } from '../../hooks/use_nav_control_screen_context';

export function NavControl({}: {}) {
  const service = useObservabilityAIAssistantAppService();

  const {
    services: {
      plugins: {
        start: {
          observabilityAIAssistant: { ObservabilityAIAssistantChatServiceContext },
        },
      },
    },
  } = useKibana();

  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  useNavControlScreenContext();

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return hasBeenOpened ? service.start({ signal }) : undefined;
    },
    [service, hasBeenOpened]
  );

  const [isOpen, setIsOpen] = useState(false);

  const keyRef = useRef(v4());

  const { isVisible } = useIsNavControlVisible();

  useEffect(() => {
    const conversationSubscription = service.conversations.predefinedConversation$.subscribe(() => {
      setHasBeenOpened(true);
      setIsOpen(true);
    });

    return () => {
      conversationSubscription.unsubscribe();
    };
  }, [service.conversations.predefinedConversation$]);

  const { messages, title } = useObservable(service.conversations.predefinedConversation$) ?? {
    messages: [],
    title: undefined,
  };

  const theme = useTheme();

  const buttonCss = css`
    padding: 0px 8px;

    svg path {
      fill: ${theme.colors.darkestShade};
    }
  `;

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <EuiButton
        data-test-subj="observabilityAiAssistantAppNavControlButton"
        css={buttonCss}
        onClick={() => {
          service.conversations.openNewConversation({
            messages: [],
          });
        }}
        color="primary"
        size="s"
        fullWidth={false}
        minWidth={0}
      >
        <AssistantAvatar size="xs" />
      </EuiButton>
      {chatService.value ? (
        <ObservabilityAIAssistantChatServiceContext.Provider value={chatService.value}>
          <ChatFlyout
            key={keyRef.current}
            isOpen={isOpen}
            initialMessages={messages}
            initialTitle={title ?? ''}
            onClose={() => {
              setIsOpen(false);
            }}
          />
        </ObservabilityAIAssistantChatServiceContext.Provider>
      ) : undefined}
    </>
  );
}

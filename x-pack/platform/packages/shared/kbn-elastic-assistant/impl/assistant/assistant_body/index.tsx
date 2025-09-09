/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, FunctionComponent, SetStateAction } from 'react';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import { css } from '@emotion/react';
import type { PromptResponse } from '@kbn/elastic-assistant-common';
import { AssistantBeacon } from '@kbn/ai-assistant-icon';
import { ConversationSharedState } from '@kbn/elastic-assistant-common';
import { SharedConversationOwnerCallout } from '../shared_conversation_callout/owner';
import { EmptyConvo } from './empty_convo';
import { WelcomeSetup } from './welcome_setup';
import type { Conversation } from '../../..';
import { UpgradeLicenseCallToAction } from '../upgrade_license_cta';
import * as i18n from '../translations';
interface Props {
  allSystemPrompts: PromptResponse[];
  comments: JSX.Element;
  conversationSharedState: ConversationSharedState;
  currentConversation: Conversation | undefined;
  currentSystemPromptId: string | undefined;
  handleOnConversationSelected: ({ cId }: { cId: string }) => Promise<void>;
  isAssistantEnabled: boolean;
  isConversationOwner: boolean;
  isSettingsModalVisible: boolean;
  isWelcomeSetup: boolean;
  isLoading: boolean;
  http: HttpSetup;
  setCurrentSystemPromptId: (promptId: string | undefined) => void;
  setIsSettingsModalVisible: Dispatch<SetStateAction<boolean>>;
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>;
}

export const AssistantBody: FunctionComponent<Props> = ({
  allSystemPrompts,
  comments,
  conversationSharedState,
  currentConversation,
  currentSystemPromptId,
  handleOnConversationSelected,
  setCurrentSystemPromptId,
  http,
  isAssistantEnabled,
  isConversationOwner,
  isLoading,
  isSettingsModalVisible,
  isWelcomeSetup,
  setIsSettingsModalVisible,
  setUserPrompt,
}) => {
  const { euiTheme } = useEuiTheme();

  const isEmptyConversation = useMemo(
    () => currentConversation?.messages.length === 0,
    [currentConversation?.messages.length]
  );

  const disclaimer = useMemo(
    () =>
      isEmptyConversation && (
        <EuiText
          data-test-subj="assistant-disclaimer"
          textAlign="center"
          color={euiTheme.colors.textDisabled}
          size="xs"
          css={css`
            margin: 0 ${euiTheme.size.l} ${euiTheme.size.m} ${euiTheme.size.l};
          `}
        >
          {i18n.DISCLAIMER}
        </EuiText>
      ),
    [euiTheme, isEmptyConversation]
  );

  // Start Scrolling
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parent = commentsContainerRef.current?.parentElement;

    if (!parent) {
      return;
    }
    // when scrollHeight changes, parent is scrolled to bottom
    parent.scrollTop = parent.scrollHeight;

    (
      commentsContainerRef.current?.childNodes[0].childNodes[0] as HTMLElement
    ).lastElementChild?.scrollIntoView();
    // currentConversation is required in the dependency array to keep the scroll at the bottom.
  }, [currentConversation]);
  //  End Scrolling

  if (!isAssistantEnabled) {
    return <UpgradeLicenseCallToAction http={http} />;
  }

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween">
      <EuiFlexItem>
        {isLoading ? (
          <EuiEmptyPrompt
            data-test-subj="animatedLogo"
            icon={<AssistantBeacon backgroundColor="emptyShade" />}
          />
        ) : isWelcomeSetup ? (
          <WelcomeSetup
            currentConversation={currentConversation}
            handleOnConversationSelected={handleOnConversationSelected}
          />
        ) : isEmptyConversation ? (
          <EmptyConvo
            allSystemPrompts={allSystemPrompts}
            currentSystemPromptId={currentSystemPromptId}
            isSettingsModalVisible={isSettingsModalVisible}
            setCurrentSystemPromptId={setCurrentSystemPromptId}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
            setUserPrompt={setUserPrompt}
            connectorId={currentConversation?.apiConfig?.connectorId}
          />
        ) : (
          <EuiPanel
            hasShadow={false}
            panelRef={(element) => {
              commentsContainerRef.current = (element?.parentElement as HTMLDivElement) || null;
            }}
          >
            {comments}
          </EuiPanel>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isConversationOwner && conversationSharedState !== ConversationSharedState.PRIVATE && (
          <SharedConversationOwnerCallout
            id={currentConversation?.id ?? ''}
            isGloballyShared={conversationSharedState === ConversationSharedState.SHARED}
          />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{disclaimer}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

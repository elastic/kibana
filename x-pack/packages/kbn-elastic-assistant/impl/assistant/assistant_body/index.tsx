/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { HttpSetup } from '@kbn/core-http-browser';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { QueryObserverResult } from '@tanstack/react-query';
import { EmptyConvo } from './empty_convo';
import { WelcomeSetup } from './welcome_setup';
import { Conversation } from '../../..';
import { UpgradeLicenseCallToAction } from '../upgrade_license_cta';
import * as i18n from '../translations';
interface Props {
  allSystemPrompts: PromptResponse[];
  comments: JSX.Element;
  currentConversation: Conversation | undefined;
  currentSystemPromptId: string | undefined;
  handleOnConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => Promise<void>;
  handleOnSystemPromptSelectionChange: (systemPromptId?: string) => void;
  isAssistantEnabled: boolean;
  isSettingsModalVisible: boolean;
  isWelcomeSetup: boolean;
  refetchCurrentUserConversations: () => Promise<
    QueryObserverResult<Record<string, Conversation>, unknown>
  >;
  http: HttpSetup;
  setIsSettingsModalVisible: Dispatch<SetStateAction<boolean>>;
}

export const AssistantBody: FunctionComponent<Props> = ({
  allSystemPrompts,
  comments,
  currentConversation,
  currentSystemPromptId,
  handleOnConversationSelected,
  handleOnSystemPromptSelectionChange,
  http,
  isAssistantEnabled,
  isSettingsModalVisible,
  isWelcomeSetup,
  refetchCurrentUserConversations,
  setIsSettingsModalVisible,
}) => {
  const isNewConversation = useMemo(
    () => currentConversation?.messages.length === 0,
    [currentConversation?.messages.length]
  );

  const disclaimer = useMemo(
    () =>
      isNewConversation && (
        <EuiText
          data-test-subj="assistant-disclaimer"
          textAlign="center"
          color={euiThemeVars.euiColorMediumShade}
          size="xs"
          css={css`
            margin: 0 ${euiThemeVars.euiSizeL} ${euiThemeVars.euiSizeM} ${euiThemeVars.euiSizeL};
          `}
        >
          {i18n.DISCLAIMER}
        </EuiText>
      ),
    [isNewConversation]
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
  });
  //  End Scrolling

  if (!isAssistantEnabled) {
    return <UpgradeLicenseCallToAction http={http} />;
  }

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        {isWelcomeSetup ? (
          <WelcomeSetup
            currentConversation={currentConversation}
            handleOnConversationSelected={handleOnConversationSelected}
          />
        ) : currentConversation?.messages.length === 0 ? (
          <EmptyConvo
            allSystemPrompts={allSystemPrompts}
            currentConversation={currentConversation}
            currentSystemPromptId={currentSystemPromptId}
            handleOnSystemPromptSelectionChange={handleOnSystemPromptSelectionChange}
            isSettingsModalVisible={isSettingsModalVisible}
            refetchCurrentUserConversations={refetchCurrentUserConversations}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
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
      <EuiFlexItem grow={false}>{disclaimer}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

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
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { AssistantBeacon } from '@kbn/ai-assistant-icon';
import { NeedLicenseUpgrade } from '@kbn/ai-assistant-cta';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { EmptyConvo } from './empty_convo';
import { Conversation } from '../../..';
import * as i18n from '../translations';
import { CreateConnector } from './create_connector';

const LICENSE_MANAGEMENT_LOCATOR = 'LICENSE_MANAGEMENT_LOCATOR';

interface Props {
  allSystemPrompts: PromptResponse[];
  comments: JSX.Element;
  currentConversation: Conversation | undefined;
  currentSystemPromptId: string | undefined;
  isAssistantEnabled: boolean;
  isSettingsModalVisible: boolean;
  isWelcomeSetup: boolean;
  isLoading: boolean;
  share: SharePluginStart;
  setCurrentSystemPromptId: (promptId: string | undefined) => void;
  setIsSettingsModalVisible: Dispatch<SetStateAction<boolean>>;
}

export const AssistantBody: FunctionComponent<Props> = ({
  allSystemPrompts,
  comments,
  currentConversation,
  currentSystemPromptId,
  setCurrentSystemPromptId,
  share,
  isAssistantEnabled,
  isLoading,
  isSettingsModalVisible,
  isWelcomeSetup,
  setIsSettingsModalVisible,
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
    const locator = share.url.locators.get(LICENSE_MANAGEMENT_LOCATOR);

    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem>
          <NeedLicenseUpgrade
            onManageLicense={() =>
              locator?.navigate({
                page: 'dashboard',
              })
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isWelcomeSetup) {
    return (
      <EuiFlexGroup direction="column" justifyContent="center">
        <EuiFlexItem grow={false}>
          <CreateConnector currentConversation={currentConversation} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween">
      <EuiFlexItem>
        {isLoading ? (
          <EuiEmptyPrompt
            data-test-subj="animatedLogo"
            icon={<AssistantBeacon backgroundColor="emptyShade" />}
          />
        ) : isEmptyConversation ? (
          <EmptyConvo
            allSystemPrompts={allSystemPrompts}
            currentSystemPromptId={currentSystemPromptId}
            isSettingsModalVisible={isSettingsModalVisible}
            setCurrentSystemPromptId={setCurrentSystemPromptId}
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

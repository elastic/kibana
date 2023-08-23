/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/gen_ai/constants';
import { Conversation } from '../../..';
import { AssistantTitle } from '../assistant_title';
import { ConversationSelector } from '../conversations/conversation_selector';
import { AssistantSettingsButton } from '../settings/assistant_settings_button';
import * as i18n from '../translations';

interface OwnProps {
  currentConversation: Conversation;
  currentTitle: { title: string | JSX.Element; titleIcon: string };
  defaultConnectorId?: string;
  defaultProvider?: OpenAiProviderType;
  docLinks: Omit<DocLinksStart, 'links'>;
  isDisabled: boolean;
  isSettingsModalVisible: boolean;
  onConversationSelected: (cId: string) => void;
  onToggleShowAnonymizedValues: (e: EuiSwitchEvent) => void;
  selectedConversationId: string;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedConversationId: React.Dispatch<React.SetStateAction<string>>;
  shouldDisableKeyboardShortcut?: () => boolean;
  showAnonymizedValues: boolean;
}

type Props = OwnProps;
/**
 * Renders the header of the Elastic AI Assistant.
 * Provide a user interface for selecting and managing conversations,
 * toggling the display of anonymized values, and accessing the assistant settings.
 */
export const AssistantHeader: React.FC<Props> = ({
  currentConversation,
  currentTitle,
  defaultConnectorId,
  defaultProvider,
  docLinks,
  isDisabled,
  isSettingsModalVisible,
  onConversationSelected,
  onToggleShowAnonymizedValues,
  selectedConversationId,
  setIsSettingsModalVisible,
  setSelectedConversationId,
  shouldDisableKeyboardShortcut,
  showAnonymizedValues,
}) => {
  const showAnonymizedValuesChecked = useMemo(
    () =>
      currentConversation.replacements != null &&
      Object.keys(currentConversation.replacements).length > 0 &&
      showAnonymizedValues,
    [currentConversation.replacements, showAnonymizedValues]
  );
  return (
    <>
      <EuiFlexGroup
        css={css`
          width: 100%;
        `}
        alignItems={'center'}
        justifyContent={'spaceBetween'}
      >
        <EuiFlexItem grow={false}>
          <AssistantTitle
            {...currentTitle}
            docLinks={docLinks}
            selectedConversation={currentConversation}
          />
        </EuiFlexItem>

        <EuiFlexItem
          grow={false}
          css={css`
            width: 335px;
          `}
        >
          <ConversationSelector
            defaultConnectorId={defaultConnectorId}
            defaultProvider={defaultProvider}
            selectedConversationId={selectedConversationId}
            onConversationSelected={onConversationSelected}
            shouldDisableKeyboardShortcut={shouldDisableKeyboardShortcut}
            isDisabled={isDisabled}
          />

          <>
            <EuiSpacer size={'s'} />
            <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.SHOW_ANONYMIZED_TOOLTIP}
                  position="left"
                  repositionOnScroll={true}
                >
                  <EuiSwitch
                    data-test-subj="showAnonymizedValues"
                    checked={showAnonymizedValuesChecked}
                    compressed={true}
                    disabled={currentConversation.replacements == null}
                    label={i18n.SHOW_ANONYMIZED}
                    onChange={onToggleShowAnonymizedValues}
                  />
                </EuiToolTip>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <AssistantSettingsButton
                  defaultConnectorId={defaultConnectorId}
                  defaultProvider={defaultProvider}
                  isDisabled={isDisabled}
                  isSettingsModalVisible={isSettingsModalVisible}
                  selectedConversation={currentConversation}
                  setIsSettingsModalVisible={setIsSettingsModalVisible}
                  setSelectedConversationId={setSelectedConversationId}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin={'m'} />
    </>
  );
};

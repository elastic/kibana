/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { AIConnector } from '../../connectorland/connector_selector';
import { Conversation } from '../../..';
import { AssistantTitle } from '../assistant_title';
import { ConversationSelector } from '../conversations/conversation_selector';
import { AssistantSettingsButton } from '../settings/assistant_settings_button';
import * as i18n from '../translations';

interface OwnProps {
  currentConversation: Conversation;
  defaultConnector?: AIConnector;
  docLinks: Omit<DocLinksStart, 'links'>;
  isDisabled: boolean;
  isSettingsModalVisible: boolean;
  onConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => void;
  onConversationDeleted: (conversationId: string) => void;
  onToggleShowAnonymizedValues: (e: EuiSwitchEvent) => void;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation>>;
  shouldDisableKeyboardShortcut?: () => boolean;
  showAnonymizedValues: boolean;
  title: string | JSX.Element;
  conversations: Record<string, Conversation>;
  refetchConversationsState: () => Promise<void>;
  refetchAnonymizationFieldsResults: () => Promise<FindAnonymizationFieldsResponse | undefined>;
}

type Props = OwnProps;
/**
 * Renders the header of the Elastic AI Assistant.
 * Provide a user interface for selecting and managing conversations,
 * toggling the display of anonymized values, and accessing the assistant settings.
 */
export const AssistantHeader: React.FC<Props> = ({
  currentConversation,
  defaultConnector,
  docLinks,
  isDisabled,
  isSettingsModalVisible,
  onConversationSelected,
  onConversationDeleted,
  onToggleShowAnonymizedValues,
  setIsSettingsModalVisible,
  shouldDisableKeyboardShortcut,
  showAnonymizedValues,
  title,
  setCurrentConversation,
  conversations,
  refetchConversationsState,
  refetchAnonymizationFieldsResults,
}) => {
  const showAnonymizedValuesChecked = useMemo(
    () =>
      currentConversation.replacements != null &&
      Object.keys(currentConversation.replacements).length > 0 &&
      showAnonymizedValues,
    [currentConversation.replacements, showAnonymizedValues]
  );
  const onConversationChange = useCallback(
    (updatedConversation) => {
      setCurrentConversation(updatedConversation);
      onConversationSelected({
        cId: updatedConversation.id,
        cTitle: updatedConversation.title,
      });
    },
    [onConversationSelected, setCurrentConversation]
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
            isDisabled={isDisabled}
            docLinks={docLinks}
            selectedConversation={currentConversation}
            onChange={onConversationChange}
            title={title}
          />
        </EuiFlexItem>

        <EuiFlexItem
          grow={false}
          css={css`
            width: 335px;
          `}
        >
          <ConversationSelector
            defaultConnector={defaultConnector}
            selectedConversationTitle={currentConversation.title}
            onConversationSelected={onConversationSelected}
            shouldDisableKeyboardShortcut={shouldDisableKeyboardShortcut}
            isDisabled={isDisabled}
            conversations={conversations}
            onConversationDeleted={onConversationDeleted}
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
                  defaultConnector={defaultConnector}
                  isDisabled={isDisabled}
                  isSettingsModalVisible={isSettingsModalVisible}
                  selectedConversation={currentConversation}
                  setIsSettingsModalVisible={setIsSettingsModalVisible}
                  onConversationSelected={onConversationSelected}
                  conversations={conversations}
                  refetchConversationsState={refetchConversationsState}
                  refetchAnonymizationFieldsResults={refetchAnonymizationFieldsResults}
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

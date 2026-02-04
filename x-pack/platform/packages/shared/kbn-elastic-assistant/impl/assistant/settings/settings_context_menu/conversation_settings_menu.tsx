/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiConfirmModal,
  EuiPopover,
  EuiButtonIcon,
  useEuiTheme,
  EuiSwitch,
  EuiPanel,
  EuiTitle,
  EuiHorizontalRule,
  EuiToolTip,
  EuiIconTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { isMac } from '@kbn/shared-ux-utility';
import type { ConversationWithOwner } from '../../api';
import { DeleteConversationModal } from '../../conversations/delete_conversation_modal';
import { DELETE_CONVERSATION } from '../../conversations/conversation_sidepanel/translations';
import { COPY_URL, DUPLICATE } from '../../use_conversation/translations';
import type { DataStreamApis } from '../../use_data_stream_apis';
import { useConversation } from '../../use_conversation';
import type { Conversation } from '../../../..';
import { useAssistantContext } from '../../../..';
import * as i18n from './translations';
import {
  conversationContainsAnonymizedValues,
  conversationContainsContentReferences,
} from '../../conversations/utils';

interface Params {
  isConversationOwner: boolean;
  isDisabled?: boolean;
  conversations: Record<string, ConversationWithOwner>;
  onConversationDeleted: (conversationId: string) => void;
  onConversationSelected: ({ cId }: { cId: string }) => void;
  onChatCleared?: () => void;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  selectedConversation?: Conversation;
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation | undefined>>;
}

const ConditionalWrap = ({
  condition,
  wrap,
  children,
}: {
  condition: boolean;
  wrap: (children: React.ReactElement) => React.ReactElement;
  children: React.ReactElement;
}) => (condition ? wrap(children) : children);

export const ConversationSettingsMenu: React.FC<Params> = React.memo(
  ({
    conversations,
    onConversationDeleted,
    onConversationSelected,
    isConversationOwner,
    isDisabled = false,
    onChatCleared,
    refetchCurrentUserConversations,
    selectedConversation,
    setCurrentConversation,
  }: Params) => {
    const confirmModalTitleId = useGeneratedHtmlId();
    const { copyConversationUrl, duplicateConversation } = useConversation();
    const { euiTheme } = useEuiTheme();
    const {
      setContentReferencesVisible,
      contentReferencesVisible,
      showAnonymizedValues,
      setShowAnonymizedValues,
    } = useAssistantContext();

    const [isPopoverOpen, setPopover] = useState(false);
    const [deleteConversationItem, setDeleteConversationItem] = useState<Conversation | null>(null);

    const [isResetConversationModalVisible, setIsResetConversationModalVisible] = useState(false);

    const closeDestroyModal = useCallback(() => setIsResetConversationModalVisible(false), []);

    const onButtonClick = useCallback(() => {
      setPopover(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = useCallback(() => {
      setPopover(false);
    }, []);

    const showDestroyModal = useCallback(() => {
      closePopover?.();
      setIsResetConversationModalVisible(true);
    }, [closePopover]);

    const showDeleteModal = useCallback(
      (conversation?: Conversation) => {
        closePopover?.();
        setDeleteConversationItem(conversation ?? null);
      },
      [closePopover]
    );

    const onChangeContentReferencesVisible = useCallback(
      (e: EuiSwitchEvent) => {
        setContentReferencesVisible(e.target.checked);
      },
      [setContentReferencesVisible]
    );

    const onChangeShowAnonymizedValues = useCallback(
      (e: EuiSwitchEvent) => {
        setShowAnonymizedValues(e.target.checked);
      },
      [setShowAnonymizedValues]
    );

    const selectedConversationHasCitations = useMemo(
      () => conversationContainsContentReferences(selectedConversation),
      [selectedConversation]
    );

    const selectedConversationHasAnonymizedValues = useMemo(
      () => conversationContainsAnonymizedValues(selectedConversation),
      [selectedConversation]
    );

    const selectedConversationExists = useMemo(
      () => selectedConversation && selectedConversation.id !== '',
      [selectedConversation]
    );

    const handleCopyUrl = useCallback(
      () => copyConversationUrl(selectedConversation),
      [copyConversationUrl, selectedConversation]
    );

    const handleDuplicateConversation = useCallback(
      () =>
        duplicateConversation({
          refetchCurrentUserConversations,
          selectedConversation,
          setCurrentConversation,
        }),
      [
        duplicateConversation,
        refetchCurrentUserConversations,
        selectedConversation,
        setCurrentConversation,
      ]
    );

    const items = useMemo(
      () => [
        <EuiContextMenuItem
          aria-label={'copy-url'}
          key={'copy-url'}
          icon={'link'}
          data-test-subj={'copy-url'}
          onClick={handleCopyUrl}
        >
          {COPY_URL}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'duplicate'}
          key={'duplicate'}
          onClick={handleDuplicateConversation}
          icon={'copy'}
          data-test-subj={'duplicate'}
        >
          {DUPLICATE}
        </EuiContextMenuItem>,
        ...(isConversationOwner
          ? [
              <EuiContextMenuItem
                aria-label={'delete'}
                key={'delete'}
                onClick={() => showDeleteModal(selectedConversation)}
                icon={'trash'}
                data-test-subj={'delete'}
              >
                {DELETE_CONVERSATION}
              </EuiContextMenuItem>,
            ]
          : []),
        <EuiPanel color="transparent" paddingSize="none" key={'chat-options-panel'}>
          <EuiTitle
            size="xxxs"
            key={'chat-options-title'}
            css={css`
              padding-left: ${euiTheme.size.m};
              padding-bottom: ${euiTheme.size.xs};
            `}
          >
            <h3>{i18n.CHAT_OPTIONS}</h3>
          </EuiTitle>
          <EuiHorizontalRule margin="none" />
          <EuiContextMenuItem
            aria-label={'anonymize-values'}
            key={'anonymize-values'}
            data-test-subj={'anonymize-values'}
          >
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <ConditionalWrap
                  condition={!selectedConversationHasAnonymizedValues}
                  wrap={(children) => (
                    <EuiToolTip
                      position="top"
                      key={'disabled-anonymize-values-tooltip'}
                      data-test-subj={'disabled-anonymize-values-tooltip'}
                      content={
                        <FormattedMessage
                          id="xpack.elasticAssistant.assistant.settings.anonymizeValues.disabled.tooltip"
                          defaultMessage="This conversation does not contain anonymized fields."
                        />
                      }
                    >
                      {children}
                    </EuiToolTip>
                  )}
                >
                  <EuiSwitch
                    data-test-subj={'anonymize-switch'}
                    label={i18n.ANONYMIZE_VALUES}
                    checked={showAnonymizedValues}
                    onChange={onChangeShowAnonymizedValues}
                    compressed
                    disabled={!selectedConversationHasAnonymizedValues}
                  />
                </ConditionalWrap>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  position="top"
                  key="anonymize-values-tooltip"
                  type="info"
                  content={
                    <FormattedMessage
                      id="xpack.elasticAssistant.assistant.settings.anonymizeValues.tooltip"
                      defaultMessage="Toggle to reveal or obfuscate field values in your chat stream. The data sent to the LLM is still anonymized based on settings in the Anonymization panel. Keyboard shortcut: <bold>{keyboardShortcut}</bold>"
                      values={{
                        keyboardShortcut: isMac ? '⌥ + a' : 'Alt + a',
                        bold: (str) => <strong>{str}</strong>,
                      }}
                    />
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>
          <EuiContextMenuItem
            aria-label={'show-citations'}
            key={'show-citations'}
            data-test-subj={'show-citations'}
          >
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <ConditionalWrap
                  condition={!selectedConversationHasCitations}
                  wrap={(children) => (
                    <EuiToolTip
                      position="top"
                      key={'disabled-citations-values-tooltip'}
                      data-test-subj={'disabled-citations-values-tooltip'}
                      content={
                        <FormattedMessage
                          id="xpack.elasticAssistant.assistant.settings.showCitationsLabel.disabled.tooltip"
                          defaultMessage="This conversation does not contain citations."
                        />
                      }
                    >
                      {children}
                    </EuiToolTip>
                  )}
                >
                  <EuiSwitch
                    data-test-subj={'citations-switch'}
                    label={i18n.SHOW_CITATIONS}
                    checked={contentReferencesVisible}
                    onChange={onChangeContentReferencesVisible}
                    compressed
                    disabled={!selectedConversationHasCitations}
                  />
                </ConditionalWrap>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  position="top"
                  key="show-citations-tooltip"
                  type="info"
                  content={
                    <FormattedMessage
                      id="xpack.elasticAssistant.assistant.settings.showCitationsLabel.tooltip"
                      defaultMessage="Keyboard shortcut: <bold>{keyboardShortcut}</bold>"
                      values={{
                        keyboardShortcut: isMac ? '⌥ + c' : 'Alt + c',
                        bold: (str) => <strong>{str}</strong>,
                      }}
                    />
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>
          {selectedConversationExists && (
            <>
              <EuiHorizontalRule margin="none" />
              <EuiContextMenuItem
                aria-label={'clear-chat'}
                key={'clear-chat'}
                onClick={showDestroyModal}
                icon={'refresh'}
                disabled={!isConversationOwner}
                data-test-subj={'clear-chat'}
                css={
                  isConversationOwner
                    ? css`
                        color: ${euiTheme.colors.textDanger};
                      `
                    : null
                }
              >
                {i18n.RESET_CONVERSATION}
              </EuiContextMenuItem>
            </>
          )}
        </EuiPanel>,
      ],
      [
        handleCopyUrl,
        handleDuplicateConversation,
        isConversationOwner,
        euiTheme.size.m,
        euiTheme.size.xs,
        euiTheme.colors.textDanger,
        selectedConversationHasAnonymizedValues,
        showAnonymizedValues,
        onChangeShowAnonymizedValues,
        selectedConversationHasCitations,
        contentReferencesVisible,
        onChangeContentReferencesVisible,
        selectedConversationExists,
        showDestroyModal,
        showDeleteModal,
        selectedConversation,
      ]
    );

    const handleReset = useCallback(() => {
      onChatCleared?.();
      closeDestroyModal();
      closePopover?.();
    }, [onChatCleared, closeDestroyModal, closePopover]);

    return (
      <>
        <EuiToolTip content={i18n.CONVO_ASSISTANT_MENU}>
          <EuiPopover
            button={
              <EuiButtonIcon
                aria-label={i18n.CONVO_ASSISTANT_MENU}
                isDisabled={isDisabled}
                iconType="boxesVertical"
                onClick={onButtonClick}
                data-test-subj="conversation-settings-menu"
              />
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="leftUp"
          >
            <EuiContextMenuPanel
              items={items}
              css={css`
                width: 280px;
              `}
            />
          </EuiPopover>
        </EuiToolTip>
        {isResetConversationModalVisible && (
          <EuiConfirmModal
            aria-labelledby={confirmModalTitleId}
            title={i18n.RESET_CONVERSATION}
            titleProps={{ id: confirmModalTitleId }}
            onCancel={closeDestroyModal}
            onConfirm={handleReset}
            cancelButtonText={i18n.CANCEL_BUTTON_TEXT}
            confirmButtonText={i18n.RESET_BUTTON_TEXT}
            buttonColor="danger"
            defaultFocusedButton="confirm"
            data-test-subj="reset-conversation-modal"
          >
            <p>{i18n.CLEAR_CHAT_CONFIRMATION}</p>
          </EuiConfirmModal>
        )}
        <DeleteConversationModal
          conversationList={Object.values(conversations)}
          currentConversationId={selectedConversation?.id}
          deleteConversationItem={deleteConversationItem}
          onConversationDeleted={onConversationDeleted}
          onConversationSelected={onConversationSelected}
          setDeleteConversationItem={setDeleteConversationItem}
        />
      </>
    );
  }
);

ConversationSettingsMenu.displayName = 'ConversationSettingsMenu';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiConfirmModal,
  EuiNotificationBadge,
  EuiPopover,
  EuiButtonIcon,
  useEuiTheme,
  EuiSwitch,
  EuiPanel,
  EuiTitle,
  EuiHorizontalRule,
  EuiToolTip,
  EuiSwitchEvent,
  EuiIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { AnonymizationSettingsManagement } from '../../../data_anonymization/settings/anonymization_settings_management';
import { Conversation, useAssistantContext } from '../../../..';
import * as i18n from '../../assistant_header/translations';
import { AlertsSettingsModal } from '../alerts_settings/alerts_settings_modal';
import { KNOWLEDGE_BASE_TAB } from '../const';
import { AI_ASSISTANT_MENU } from './translations';
import {
  conversationContainsAnonymizedValues,
  conversationContainsContentReferences,
} from '../../conversations/utils';

interface Params {
  isDisabled?: boolean;
  onChatCleared?: () => void;
  selectedConversation?: Conversation;
}

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const ConditionalWrap = ({
  condition,
  wrap,
  children,
}: {
  condition: boolean;
  wrap: (children: React.ReactElement) => React.ReactElement;
  children: React.ReactElement;
}) => (condition ? wrap(children) : children);

export const SettingsContextMenu: React.FC<Params> = React.memo(
  ({ isDisabled = false, onChatCleared, selectedConversation }: Params) => {
    const { euiTheme } = useEuiTheme();
    const {
      assistantAvailability,
      navigateToApp,
      knowledgeBase,
      setContentReferencesVisible,
      contentReferencesVisible,
      showAnonymizedValues,
      setShowAnonymizedValues,
      showAssistantOverlay,
    } = useAssistantContext();

    const [isPopoverOpen, setPopover] = useState(false);

    const [isResetConversationModalVisible, setIsResetConversationModalVisible] = useState(false);

    const [isAlertsSettingsModalVisible, setIsAlertsSettingsModalVisible] = useState(false);
    const closeAlertSettingsModal = useCallback(() => setIsAlertsSettingsModalVisible(false), []);
    const showAlertSettingsModal = useCallback(() => setIsAlertsSettingsModalVisible(true), []);

    const [isAnonymizationModalVisible, setIsAnonymizationModalVisible] = useState(false);
    const closeAnonymizationModal = useCallback(() => setIsAnonymizationModalVisible(false), []);
    const showAnonymizationModal = useCallback(() => setIsAnonymizationModalVisible(true), []);

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

    const handleNavigateToSettings = useCallback(() => {
      if (assistantAvailability.hasSearchAILakeConfigurations) {
        navigateToApp('securitySolutionUI', {
          deepLinkId: SecurityPageName.configurationsAiSettings,
        });
        showAssistantOverlay?.({ showOverlay: false });
      } else {
        navigateToApp('management', {
          path: 'kibana/securityAiAssistantManagement',
        });
      }
    }, [assistantAvailability.hasSearchAILakeConfigurations, navigateToApp, showAssistantOverlay]);

    const handleNavigateToAnonymization = useCallback(() => {
      showAnonymizationModal();
      closePopover();
    }, [closePopover, showAnonymizationModal]);

    const handleNavigateToKnowledgeBase = useCallback(() => {
      if (assistantAvailability.hasSearchAILakeConfigurations) {
        navigateToApp('securitySolutionUI', {
          deepLinkId: SecurityPageName.configurationsAiSettings,
          path: `?tab=${KNOWLEDGE_BASE_TAB}`,
        });
        showAssistantOverlay?.({ showOverlay: false });
      } else {
        navigateToApp('management', {
          path: `kibana/securityAiAssistantManagement?tab=${KNOWLEDGE_BASE_TAB}`,
        });
      }
    }, [assistantAvailability.hasSearchAILakeConfigurations, navigateToApp, showAssistantOverlay]);

    const handleShowAlertsModal = useCallback(() => {
      showAlertSettingsModal();
      closePopover();
    }, [closePopover, showAlertSettingsModal]);

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

    const items = useMemo(
      () => [
        <EuiContextMenuItem
          aria-label={'ai-assistant-settings'}
          key={'ai-assistant-settings'}
          onClick={handleNavigateToSettings}
          icon={'gear'}
          data-test-subj={'ai-assistant-settings'}
        >
          {i18n.AI_ASSISTANT_SETTINGS}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'knowledge-base'}
          key={'knowledge-base'}
          icon={'documents'}
          data-test-subj={'knowledge-base'}
          onClick={handleNavigateToKnowledgeBase}
        >
          {i18n.KNOWLEDGE_BASE}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'anonymization'}
          key={'anonymization'}
          onClick={handleNavigateToAnonymization}
          icon={'eye'}
          data-test-subj={'anonymization'}
        >
          {i18n.ANONYMIZATION}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'alerts-to-analyze'}
          key={'alerts-to-analyze'}
          onClick={handleShowAlertsModal}
          icon={'magnifyWithExclamation'}
          data-test-subj={'alerts-to-analyze'}
        >
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>{i18n.ALERTS_TO_ANALYZE}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="subdued">
                {knowledgeBase.latestAlerts}
              </EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiContextMenuItem>,
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
                <EuiToolTip
                  position="top"
                  key={'anonymize-values-tooltip'}
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
                >
                  <EuiIcon tabIndex={0} type="info" />
                </EuiToolTip>
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
                <EuiToolTip
                  position="top"
                  key={'show-citations-tooltip'}
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
                >
                  <EuiIcon tabIndex={0} type="info" />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>

          <EuiHorizontalRule margin="none" />
          <EuiContextMenuItem
            aria-label={'clear-chat'}
            key={'clear-chat'}
            onClick={showDestroyModal}
            icon={'refresh'}
            data-test-subj={'clear-chat'}
            css={css`
              color: ${euiTheme.colors.textDanger};
            `}
          >
            {i18n.RESET_CONVERSATION}
          </EuiContextMenuItem>
        </EuiPanel>,
      ],
      [
        contentReferencesVisible,
        onChangeContentReferencesVisible,
        showAnonymizedValues,
        onChangeShowAnonymizedValues,
        euiTheme.colors.textDanger,
        handleNavigateToAnonymization,
        handleNavigateToKnowledgeBase,
        handleNavigateToSettings,
        handleShowAlertsModal,
        knowledgeBase.latestAlerts,
        showDestroyModal,
        euiTheme.size.m,
        euiTheme.size.xs,
        selectedConversationHasCitations,
        selectedConversationHasAnonymizedValues,
      ]
    );

    const handleReset = useCallback(() => {
      onChatCleared?.();
      closeDestroyModal();
      closePopover?.();
    }, [onChatCleared, closeDestroyModal, closePopover]);

    return (
      <>
        <EuiPopover
          button={
            <EuiButtonIcon
              aria-label={AI_ASSISTANT_MENU}
              isDisabled={isDisabled}
              iconType="boxesVertical"
              onClick={onButtonClick}
              data-test-subj="chat-context-menu"
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
        {isAlertsSettingsModalVisible && <AlertsSettingsModal onClose={closeAlertSettingsModal} />}
        {isAnonymizationModalVisible && (
          <AnonymizationSettingsManagement modalMode onClose={closeAnonymizationModal} />
        )}
        {isResetConversationModalVisible && (
          <EuiConfirmModal
            title={i18n.RESET_CONVERSATION}
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
      </>
    );
  }
);

SettingsContextMenu.displayName = 'SettingsContextMenu';

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
  EuiNotificationBadge,
  EuiPopover,
  EuiButtonIcon,
  EuiToolTip,
  EuiButton,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AnonymizationSettingsManagement } from '../../../data_anonymization/settings/anonymization_settings_management';
import { robotIconType } from './robot_icon';
import { useAssistantContext } from '../../../..';
import { AlertsSettingsModal } from '../alerts_settings/alerts_settings_modal';
import { KNOWLEDGE_BASE_TAB } from '../const';
import * as i18n from './translations';
import { AgentBuilderTourStep } from '../../../tour/agent_builder';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../tour/const';

interface Params {
  isDisabled?: boolean;
}

export const AssistantSettingsContextMenu: React.FC<Params> = React.memo(
  ({ isDisabled = false }: Params) => {
    const {
      assistantAvailability,
      navigateToApp,
      knowledgeBase,
      showAssistantOverlay,
      settings,
      toasts,
    } = useAssistantContext();

    const [isPopoverOpen, setPopover] = useState(false);

    const [isAlertsSettingsModalVisible, setIsAlertsSettingsModalVisible] = useState(false);
    const closeAlertSettingsModal = useCallback(() => setIsAlertsSettingsModalVisible(false), []);
    const showAlertSettingsModal = useCallback(() => setIsAlertsSettingsModalVisible(true), []);

    const [isAnonymizationModalVisible, setIsAnonymizationModalVisible] = useState(false);
    const closeAnonymizationModal = useCallback(() => setIsAnonymizationModalVisible(false), []);
    const showAnonymizationModal = useCallback(() => setIsAnonymizationModalVisible(true), []);
    const [isAIAgentModalVisible, setIsAIAgentModalVisible] = useState(false);

    const onButtonClick = useCallback(() => {
      setPopover(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = useCallback(() => {
      setPopover(false);
    }, []);

    const handleOpenAIAgentModal = useCallback(() => {
      setIsAIAgentModalVisible(true);
      closePopover();
    }, [closePopover]);
    const handleCancelAIAgent = useCallback(() => {
      setIsAIAgentModalVisible(false);
    }, []);
    const handleConfirmAIAgent = useCallback(async () => {
      try {
        await settings.client.set(AI_CHAT_EXPERIENCE_TYPE, AIChatExperience.Agent);
        setIsAIAgentModalVisible(false);
        window.location.reload();
      } catch (error) {
        if (toasts) {
          toasts.addError(error instanceof Error ? error : new Error(String(error)), {
            title: i18n.AI_AGENT_SWITCH_ERROR,
          });
        }
      }
    }, [settings.client, toasts]);

    const handleNavigateToSettings = useCallback(() => {
      if (assistantAvailability.hasSearchAILakeConfigurations) {
        navigateToApp('securitySolutionUI', {
          deepLinkId: SecurityPageName.configurationsAiSettings,
        });
        showAssistantOverlay?.({ showOverlay: false });
      } else {
        navigateToApp('management', {
          path: 'ai/securityAiAssistantManagement',
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
          path: `ai/securityAiAssistantManagement?tab=${KNOWLEDGE_BASE_TAB}`,
        });
      }
    }, [assistantAvailability.hasSearchAILakeConfigurations, navigateToApp, showAssistantOverlay]);

    const handleShowAlertsModal = useCallback(() => {
      showAlertSettingsModal();
      closePopover();
    }, [closePopover, showAlertSettingsModal]);

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
        ...(assistantAvailability.isAiAgentsEnabled
          ? [
              <EuiContextMenuItem key="try-ai-agent">
                {!assistantAvailability.hasAgentBuilderManagePrivilege ? (
                  <EuiToolTip
                    display="block"
                    content={i18n.AI_AGENT_MANAGE_PRIVILEGE_REQUIRED}
                    anchorClassName="euiToolTipAnchor-try-ai-agent"
                  >
                    <span
                      tabIndex={0}
                      css={css`
                        display: block;
                        width: 100%;
                      `}
                    >
                      <EuiButton
                        aria-label={i18n.TRY_AI_AGENT}
                        onClick={handleOpenAIAgentModal}
                        iconType={robotIconType}
                        color="accent"
                        size="s"
                        fullWidth
                        isDisabled={!assistantAvailability.hasAgentBuilderManagePrivilege}
                        data-test-subj="try-ai-agent"
                        css={css`
                          font-weight: 500;
                        `}
                      >
                        {i18n.TRY_AI_AGENT}
                      </EuiButton>
                    </span>
                  </EuiToolTip>
                ) : (
                  <EuiButton
                    aria-label={i18n.TRY_AI_AGENT}
                    onClick={handleOpenAIAgentModal}
                    iconType={robotIconType}
                    color="accent"
                    size="s"
                    fullWidth
                    isDisabled={!assistantAvailability.hasAgentBuilderManagePrivilege}
                    data-test-subj="try-ai-agent"
                    css={css`
                      font-weight: 500;
                    `}
                  >
                    {i18n.TRY_AI_AGENT}
                  </EuiButton>
                )}
              </EuiContextMenuItem>,
            ]
          : []),
      ],
      [
        handleNavigateToSettings,
        handleNavigateToKnowledgeBase,
        handleNavigateToAnonymization,
        handleShowAlertsModal,
        knowledgeBase.latestAlerts,
        assistantAvailability.isAiAgentsEnabled,
        assistantAvailability.hasAgentBuilderManagePrivilege,
        handleOpenAIAgentModal,
      ]
    );
    const isAgentUpgradeDisabled = useMemo(() => {
      return (
        isDisabled ||
        !assistantAvailability.hasAgentBuilderManagePrivilege ||
        !assistantAvailability.isAiAgentsEnabled
      );
    }, [assistantAvailability, isDisabled]);

    return (
      <>
        <EuiToolTip content={i18n.AI_ASSISTANT_MENU}>
          <AgentBuilderTourStep
            isDisabled={isAgentUpgradeDisabled}
            storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.AGENT_BUILDER_TOUR}
            onContinue={handleOpenAIAgentModal}
          >
            <EuiPopover
              button={
                <EuiButtonIcon
                  aria-label={i18n.AI_ASSISTANT_MENU}
                  isDisabled={isDisabled}
                  iconType="controls"
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
          </AgentBuilderTourStep>
        </EuiToolTip>
        {isAlertsSettingsModalVisible && <AlertsSettingsModal onClose={closeAlertSettingsModal} />}
        {isAnonymizationModalVisible && (
          <AnonymizationSettingsManagement modalMode onClose={closeAnonymizationModal} />
        )}
        {isAIAgentModalVisible && (
          <AIAgentConfirmationModal
            onConfirm={handleConfirmAIAgent}
            onCancel={handleCancelAIAgent}
          />
        )}
      </>
    );
  }
);

AssistantSettingsContextMenu.displayName = 'AssistantSettingsContextMenu';

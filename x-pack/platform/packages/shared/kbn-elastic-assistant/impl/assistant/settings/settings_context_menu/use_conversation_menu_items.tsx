/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiContextMenuItem, EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { AnonymizationSettingsManagement } from '../../../data_anonymization/settings/anonymization_settings_management';
import { useAssistantContext } from '../../../assistant_context';
import { AlertsSettingsModal } from '../alerts_settings/alerts_settings_modal';
import { KNOWLEDGE_BASE_TAB } from '../const';
import * as i18n from './translations';

interface UseConversationMenuItemsProps {
  isDisabled?: boolean;
}

export const useConversationMenuItems = ({
  isDisabled = false,
}: UseConversationMenuItemsProps = {}) => {
  const { assistantAvailability, navigateToApp, knowledgeBase, showAssistantOverlay } =
    useAssistantContext();

  const [isAlertsSettingsModalVisible, setIsAlertsSettingsModalVisible] = useState(false);
  const [isAnonymizationModalVisible, setIsAnonymizationModalVisible] = useState(false);

  const closeAlertSettingsModal = useCallback(() => setIsAlertsSettingsModalVisible(false), []);
  const showAlertSettingsModal = useCallback(() => setIsAlertsSettingsModalVisible(true), []);

  const closeAnonymizationModal = useCallback(() => setIsAnonymizationModalVisible(false), []);
  const showAnonymizationModal = useCallback(() => setIsAnonymizationModalVisible(true), []);

  const handleNavigateToAnonymization = useCallback(() => {
    showAnonymizationModal();
  }, [showAnonymizationModal]);

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
  }, [showAlertSettingsModal]);

  const menuItems = useMemo(
    () => [
      <EuiContextMenuItem
        aria-label={'knowledge-base'}
        key={'knowledge-base'}
        icon={'documents'}
        data-test-subj={'knowledge-base'}
        onClick={handleNavigateToKnowledgeBase}
        disabled={isDisabled}
      >
        {i18n.KNOWLEDGE_BASE}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        aria-label={'anonymization'}
        key={'anonymization'}
        onClick={handleNavigateToAnonymization}
        icon={'eye'}
        data-test-subj={'anonymization'}
        disabled={isDisabled}
      >
        {i18n.ANONYMIZATION}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        aria-label={'alerts-to-analyze'}
        key={'alerts-to-analyze'}
        onClick={handleShowAlertsModal}
        icon={'magnifyWithExclamation'}
        data-test-subj={'alerts-to-analyze'}
        disabled={isDisabled}
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
    ],
    [
      handleNavigateToKnowledgeBase,
      handleNavigateToAnonymization,
      handleShowAlertsModal,
      knowledgeBase.latestAlerts,
      isDisabled,
    ]
  );

  const modals = useMemo(
    () => (
      <>
        {isAlertsSettingsModalVisible && <AlertsSettingsModal onClose={closeAlertSettingsModal} />}
        {isAnonymizationModalVisible && (
          <AnonymizationSettingsManagement modalMode onClose={closeAnonymizationModal} />
        )}
      </>
    ),
    [
      isAlertsSettingsModalVisible,
      isAnonymizationModalVisible,
      closeAlertSettingsModal,
      closeAnonymizationModal,
    ]
  );

  return {
    menuItems,
    modals,
  };
};

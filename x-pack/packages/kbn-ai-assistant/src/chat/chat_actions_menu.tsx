/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { ConnectorSelectorBase } from '@kbn/observability-ai-assistant-plugin/public';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';
import { useKibana } from '../hooks/use_kibana';
import { useKnowledgeBase } from '../hooks';

export function ChatActionsMenu({
  connectors,
  conversationId,
  disabled,
  onCopyConversationClick,
}: {
  connectors: UseGenAIConnectorsResult;
  conversationId?: string;
  disabled: boolean;
  onCopyConversationClick: () => void;
}) {
  const { application, http } = useKibana().services;
  const knowledgeBase = useKnowledgeBase();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigateToConnectors = () => {
    application?.navigateToApp('management', {
      path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
    });
  };

  const toggleActionsMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigateToSettings = () => {
    application?.navigateToUrl(
      http!.basePath.prepend(`/app/management/kibana/observabilityAiAssistantManagement`)
    );
  };

  const handleNavigateToSettingsKnowledgeBase = () => {
    application?.navigateToUrl(
      http!.basePath.prepend(
        `/app/management/kibana/observabilityAiAssistantManagement?tab=knowledge_base`
      )
    );
  };

  return (
    <EuiPopover
      isOpen={isOpen}
      button={
        <EuiToolTip
          content={i18n.translate('xpack.aiAssistant.chatActionsMenu.euiToolTip.moreActionsLabel', {
            defaultMessage: 'More actions',
          })}
          display="block"
        >
          <EuiButtonIcon
            data-test-subj="observabilityAiAssistantChatActionsMenuButtonIcon"
            disabled={disabled}
            iconType="boxesVertical"
            onClick={toggleActionsMenu}
            aria-label={i18n.translate(
              'xpack.aiAssistant.chatActionsMenu.euiButtonIcon.menuLabel',
              { defaultMessage: 'Menu' }
            )}
          />
        </EuiToolTip>
      }
      panelPaddingSize="none"
      closePopover={toggleActionsMenu}
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: i18n.translate('xpack.aiAssistant.chatHeader.actions.title', {
              defaultMessage: 'Actions',
            }),
            items: [
              ...(knowledgeBase?.status.value?.enabled
                ? [
                    {
                      name: i18n.translate('xpack.aiAssistant.chatHeader.actions.knowledgeBase', {
                        defaultMessage: 'Manage knowledge base',
                      }),
                      onClick: () => {
                        toggleActionsMenu();
                        handleNavigateToSettingsKnowledgeBase();
                      },
                    },
                  ]
                : []),
              {
                name: i18n.translate('xpack.aiAssistant.chatHeader.actions.settings', {
                  defaultMessage: 'AI Assistant Settings',
                }),
                onClick: () => {
                  toggleActionsMenu();
                  handleNavigateToSettings();
                },
              },
              {
                name: (
                  <div className="eui-textTruncate">
                    {i18n.translate('xpack.aiAssistant.chatHeader.actions.connector', {
                      defaultMessage: 'Connector',
                    })}{' '}
                    <strong>
                      {
                        connectors.connectors?.find(({ id }) => id === connectors.selectedConnector)
                          ?.name
                      }
                    </strong>
                  </div>
                ),
                panel: 1,
              },
              {
                name: i18n.translate('xpack.aiAssistant.chatHeader.actions.copyConversation', {
                  defaultMessage: 'Copy conversation',
                }),
                disabled: !conversationId,
                onClick: () => {
                  toggleActionsMenu();
                  onCopyConversationClick();
                },
              },
            ],
          },
          {
            id: 1,
            width: 256,
            title: i18n.translate('xpack.aiAssistant.chatHeader.actions.connector', {
              defaultMessage: 'Connector',
            }),
            content: (
              <EuiPanel>
                <ConnectorSelectorBase {...connectors} />

                <EuiButtonEmpty
                  flush="left"
                  size="xs"
                  data-test-subj="settingsTabGoToConnectorsButton"
                  onClick={handleNavigateToConnectors}
                >
                  {i18n.translate('xpack.aiAssistant.settingsPage.goToConnectorsButtonLabel', {
                    defaultMessage: 'Manage connectors',
                  })}
                </EuiButtonEmpty>
              </EuiPanel>
            ),
          },
        ]}
      />
    </EuiPopover>
  );
}

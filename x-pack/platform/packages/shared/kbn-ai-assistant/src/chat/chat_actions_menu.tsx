/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  EuiPopoverFooter,
  EuiToolTip,
} from '@elastic/eui';
import {
  navigateToSettingsManagementApp,
  useAgentBuilderOptIn,
} from '@kbn/observability-ai-assistant-plugin/public';
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal';
import {
  ConnectorSelectable,
  type ConnectorSelectableComponentProps,
} from '@kbn/ai-assistant-connector-selector-action';
import type { ApplicationStart } from '@kbn/core/public';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { isSupportedConnectorType } from '@kbn/inference-common';
import { RobotIcon } from '@kbn/ai-assistant-icon';
import { GenerativeAIForObservabilityConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';
import { useKibana } from '../hooks/use_kibana';
import { useKnowledgeBase } from '../hooks';

type ConnectorLists = [
  preConfigured: ConnectorSelectableComponentProps['preConfiguredConnectors'],
  custom: ConnectorSelectableComponentProps['customConnectors']
];
export function ChatActionsMenu({
  connectors,
  disabled,
  isConversationApp,
  navigateToConnectorsManagementApp,
}: {
  connectors: UseGenAIConnectorsResult;
  disabled: boolean;
  isConversationApp: boolean;
  navigateToConnectorsManagementApp: (application: ApplicationStart) => void;
}) {
  const { application, http, triggersActionsUi, docLinks } = useKibana().services;
  const knowledgeBase = useKnowledgeBase();
  const [isOpen, setIsOpen] = useState(false);
  const [connectorFlyoutOpen, setConnectorFlyoutOpen] = useState(false);

  const {
    showAgentBuilderOptInCta,
    isAgentBuilderConfirmationModalOpen,
    openAgentBuilderConfirmationModal,
    closeAgentBuilderConfirmationModal,
    confirmAgentBuilderOptIn,
  } = useAgentBuilderOptIn({ navigateFromConversationApp: isConversationApp });

  const toggleActionsMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigateToSettingsKnowledgeBase = () => {
    application?.navigateToUrl(
      http!.basePath.prepend(
        `/app/management/ai/observabilityAiAssistantManagement?tab=knowledge_base`
      )
    );
  };

  const [preConfiguredConnectors, customConnectors] = useMemo<ConnectorLists>(() => {
    if (!connectors.connectors) return [[], []];

    return connectors.connectors.reduce<ConnectorLists>(
      ([pre, custom], { id, name, isPreconfigured }) => {
        const item = { value: id, label: name };
        return isPreconfigured ? [[...pre, item], custom] : [pre, [...custom, item]];
      },
      [[], []]
    );
  }, [connectors.connectors]);

  const ConnectorFlyout = useMemo(
    () => triggersActionsUi.getAddConnectorFlyout,
    [triggersActionsUi]
  );

  const onConnectorCreated = (createdConnector: ActionConnector) => {
    setConnectorFlyoutOpen(false);

    if (isSupportedConnectorType(createdConnector.actionTypeId)) {
      connectors.reloadConnectors();
    }
  };

  const contextMenuItems = [
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
        navigateToSettingsManagementApp(application!);
      },
    },
    {
      name: (
        <div className="eui-textTruncate">
          {i18n.translate('xpack.aiAssistant.chatHeader.actions.connector', {
            defaultMessage: 'Connector',
          })}{' '}
          <strong>
            {connectors.connectors?.find(({ id }) => id === connectors.selectedConnector)?.name}
          </strong>
        </div>
      ),
      panel: !connectors.isConnectorSelectionRestricted ? 1 : undefined,
    },
    ...(showAgentBuilderOptInCta
      ? [
          {
            isSeparator: true as const,
            key: 'agentBuilderOptInSeparator',
          },
          {
            renderItem: () => (
              <EuiPopoverFooter paddingSize="s">
                <EuiButton
                  fullWidth
                  size="s"
                  color="accent"
                  style={{ marginInlineStart: 'auto' }}
                  onClick={() => {
                    toggleActionsMenu();
                    openAgentBuilderConfirmationModal();
                  }}
                >
                  <RobotIcon size="m" />
                  {i18n.translate('xpack.aiAssistant.chatHeader.actions.agentBuilderOptInButton', {
                    defaultMessage: 'Try AI Agent',
                  })}
                </EuiButton>
              </EuiPopoverFooter>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <EuiPopover
        isOpen={isOpen}
        button={
          <EuiToolTip
            content={i18n.translate(
              'xpack.aiAssistant.chatActionsMenu.euiToolTip.moreActionsLabel',
              {
                defaultMessage: 'More actions',
              }
            )}
            display="block"
          >
            <EuiButtonIcon
              data-test-subj="observabilityAiAssistantChatActionsMenuButtonIcon"
              disabled={disabled}
              iconType="controlsHorizontal"
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
        <div>
          <EuiContextMenu
            initialPanelId={0}
            panels={[
              {
                id: 0,
                title: i18n.translate('xpack.aiAssistant.chatHeader.actions.title', {
                  defaultMessage: 'Actions',
                }),
                items: contextMenuItems,
              },
              {
                id: 1,
                width: 256,
                title: i18n.translate('xpack.aiAssistant.chatHeader.actions.connector', {
                  defaultMessage: 'Connector',
                }),
                content: (
                  <ConnectorSelectable
                    customConnectors={customConnectors}
                    preConfiguredConnectors={preConfiguredConnectors}
                    value={connectors.selectedConnector}
                    defaultConnectorId={connectors.defaultConnector}
                    onValueChange={(id: string) => {
                      connectors.selectConnector(id);
                      toggleActionsMenu();
                    }}
                    onAddConnectorClick={() => {
                      toggleActionsMenu();
                      setConnectorFlyoutOpen(true);
                    }}
                    onManageConnectorsClick={() => {
                      toggleActionsMenu();
                      navigateToConnectorsManagementApp(application!);
                    }}
                  />
                ),
              },
            ]}
          />
        </div>
      </EuiPopover>
      {connectorFlyoutOpen && (
        <ConnectorFlyout
          featureId={GenerativeAIForObservabilityConnectorFeatureId}
          onConnectorCreated={onConnectorCreated}
          onClose={() => setConnectorFlyoutOpen(false)}
        />
      )}

      {isAgentBuilderConfirmationModalOpen && docLinks?.links && (
        <AIAgentConfirmationModal
          onConfirm={confirmAgentBuilderOptIn}
          onCancel={closeAgentBuilderConfirmationModal}
          docLinks={docLinks.links}
        />
      )}
    </>
  );
}

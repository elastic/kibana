/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor, EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  useEuiTheme,
} from '@elastic/eui';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import type {
  ConnectorSelectableComponentProps,
  ConnectorSelectableProps,
} from '@kbn/ai-assistant-connector-selector-action';
import { ConnectorSelectable } from '@kbn/ai-assistant-connector-selector-action';
import type { ActionConnector, ActionType } from '@kbn/triggers-actions-ui-plugin/public';

import type { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { some } from 'lodash';
import type { AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { AttackDiscoveryStatusIndicator } from './attack_discovery_status_indicator';
import { useLoadConnectors } from '../use_load_connectors';
import * as i18n from '../translations';
import { useLoadActionTypes } from '../use_load_action_types';
import { useAssistantContext } from '../../assistant_context';
import { AddConnectorModal } from '../add_connector_modal';
import { useOptimisticSelection } from './use_optimistic_selection';
interface Props {
  fullWidth?: boolean;
  isDisabled?: boolean;
  isOpen?: boolean;
  onConnectorSelectionChange: (connector: AIConnector) => void;
  selectedConnectorId?: string;
  displayFancy?: (label: string, aIConnector?: AIConnector) => React.ReactNode;
  setIsOpen?: (isOpen: boolean) => void;
  stats?: AttackDiscoveryStats | null;

  /**
   * Allows parent components to control whether the default connector should be
   * automatically selected or the explicit user selection action required.
   */
  explicitConnectorSelection?: boolean;
}

export type AIConnector = ActionConnector & {
  // related to OpenAI connectors, ex: Azure OpenAI, OpenAI
  apiProvider?: OpenAiProviderType;
};

export const ConnectorSelector: React.FC<Props> = React.memo(
  ({
    isDisabled = false,
    isOpen = false,
    fullWidth = false,
    displayFancy,
    selectedConnectorId,
    onConnectorSelectionChange,
    setIsOpen,
    stats = null,
    explicitConnectorSelection,
  }) => {
    const {
      actionTypeRegistry,
      http,
      assistantAvailability,
      inferenceEnabled,
      settings,
      navigateToApp,
    } = useAssistantContext();
    const { euiTheme } = useEuiTheme();

    const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
    const [modalForceOpen, setModalForceOpen] = useState(isOpen);
    const { data: actionTypes } = useLoadActionTypes({ http });

    const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

    const { data: aiConnectors, refetch: refetchConnectors } = useLoadConnectors({
      http,
      inferenceEnabled,
      settings,
    });

    // Use optimistic selection hook for immediate UI feedback
    const {
      effectiveValue: effectiveSelectedConnectorId,
      setOptimisticValue: setOptimisticConnectorId,
    } = useOptimisticSelection(selectedConnectorId);

    const connectorExists = useMemo(
      () => some(aiConnectors, ['id', effectiveSelectedConnectorId]),
      [aiConnectors, effectiveSelectedConnectorId]
    );

    const onChange = useCallback(
      (connectorId: string) => {
        const connector = (aiConnectors ?? []).find((c) => c.id === connectorId);
        if (connector) {
          // Set optimistic value immediately for instant UI feedback
          setOptimisticConnectorId(connectorId);

          onConnectorSelectionChange(connector);
          setModalForceOpen(false);
        }
      },
      [aiConnectors, onConnectorSelectionChange, setModalForceOpen, setOptimisticConnectorId]
    );

    const cleanupAndCloseModal = useCallback(() => {
      setIsOpen?.(false);
      setIsConnectorModalVisible(false);
      setSelectedActionType(null);
    }, [setIsOpen]);

    const onSaveConnector = useCallback(
      (connector: ActionConnector) => {
        onConnectorSelectionChange({
          ...connector,
        });
        refetchConnectors?.();
        cleanupAndCloseModal();
      },
      [cleanupAndCloseModal, onConnectorSelectionChange, refetchConnectors]
    );

    const defaultAIConnectorId = settings.client.get<string | undefined>(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
      undefined
    );

    // Use effective value (optimistic or actual) or fall back to default
    const selectedOrDefaultConnectorId =
      effectiveSelectedConnectorId ??
      (explicitConnectorSelection ? undefined : defaultAIConnectorId);
    const selectedOrDefaultConnector = aiConnectors?.find(
      (connector) => connector.id === selectedOrDefaultConnectorId
    );
    const buttonLabel = selectedOrDefaultConnector?.name ?? i18n.INLINE_CONNECTOR_PLACEHOLDER;
    const localIsDisabled = isDisabled || !assistantAvailability.hasConnectorsReadPrivilege;

    // Group connectors into pre-configured and custom
    const { customConnectors, preConfiguredConnectors } = useMemo(
      () =>
        (aiConnectors ?? []).reduce<{
          customConnectors: ConnectorSelectableComponentProps['customConnectors'];
          preConfiguredConnectors: ConnectorSelectableComponentProps['preConfiguredConnectors'];
        }>(
          (acc, connector) => {
            if (connector.isPreconfigured) {
              acc.preConfiguredConnectors.push({
                label: connector.name,
                value: connector.id,
              });
            } else {
              acc.customConnectors.push({
                label: connector.name,
                value: connector.id,
              });
            }
            return acc;
          },
          {
            customConnectors: [],
            preConfiguredConnectors: [],
          }
        ),
      [aiConnectors]
    );

    const renderOption: ConnectorSelectableProps['renderOption'] = useCallback(
      (option: EuiSelectableOption) => {
        const attackDiscoveryStats =
          stats !== null
            ? stats.statsPerConnector.find((s) => s.connectorId === option.key) ?? null
            : null;

        return (
          <React.Fragment key={option.key}>
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false} data-test-subj={`connector-${option.label}`}>
                {option.label}
              </EuiFlexItem>
              {attackDiscoveryStats && <AttackDiscoveryStatusIndicator {...attackDiscoveryStats} />}
            </EuiFlexGroup>
          </React.Fragment>
        );
      },
      [stats]
    );

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        width: '100%',
        content: (
          <ConnectorSelectable
            onAddConnectorClick={
              assistantAvailability.hasConnectorsAllPrivilege
                ? () => setIsConnectorModalVisible(true)
                : undefined
            }
            onManageConnectorsClick={
              assistantAvailability.hasConnectorsReadPrivilege
                ? () =>
                    navigateToApp('management', {
                      path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
                    })
                : undefined
            }
            preConfiguredConnectors={preConfiguredConnectors}
            customConnectors={customConnectors}
            defaultConnectorId={defaultAIConnectorId}
            value={selectedOrDefaultConnector?.id}
            onValueChange={onChange}
            renderOption={renderOption}
          />
        ),
      },
    ];

    const input = useMemo(() => {
      return (
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          size="s"
          color="text"
          fullWidth={fullWidth}
          onClick={() => setModalForceOpen(true)}
          style={{ borderWidth: fullWidth ? 1 : 0, backgroundColor: 'transparent' }}
          contentProps={{
            style: {
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: localIsDisabled ? euiTheme.colors.textDisabled : euiTheme.colors.textPrimary,
            },
          }}
          data-test-subj="connector-selector"
          isDisabled={localIsDisabled}
        >
          {displayFancy?.(buttonLabel, selectedOrDefaultConnector) ?? buttonLabel}
        </EuiButton>
      );
    }, [
      fullWidth,
      localIsDisabled,
      displayFancy,
      buttonLabel,
      selectedOrDefaultConnector,
      setModalForceOpen,
      euiTheme.colors.textDisabled,
      euiTheme.colors.textPrimary,
    ]);

    return (
      <>
        {!connectorExists && customConnectors.length + preConfiguredConnectors.length === 0 ? (
          <EuiButtonEmpty
            data-test-subj="addNewConnectorButton"
            iconType="plusInCircle"
            isDisabled={localIsDisabled}
            size="xs"
            onClick={() => setIsConnectorModalVisible(true)}
          >
            {i18n.ADD_CONNECTOR}
          </EuiButtonEmpty>
        ) : (
          <EuiInputPopover
            input={input}
            isOpen={modalForceOpen}
            closePopover={() => setModalForceOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downRight"
            fullWidth={fullWidth}
            panelMinWidth={300}
          >
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiInputPopover>
        )}
        {isConnectorModalVisible && (
          // Crashing management app otherwise
          <Suspense fallback>
            <AddConnectorModal
              actionTypeRegistry={actionTypeRegistry}
              actionTypes={actionTypes}
              onClose={cleanupAndCloseModal}
              onSaveConnector={onSaveConnector}
              onSelectActionType={(actionType: ActionType) => setSelectedActionType(actionType)}
              selectedActionType={selectedActionType}
            />
          </Suspense>
        )}
      </>
    );
  }
);

ConnectorSelector.displayName = 'ConnectorSelector';

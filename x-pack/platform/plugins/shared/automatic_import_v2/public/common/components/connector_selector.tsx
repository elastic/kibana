/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { some } from 'lodash';
import type { ConnectorSelectableComponentProps } from '@kbn/ai-assistant-connector-selector-action';
import { ConnectorSelectable } from '@kbn/ai-assistant-connector-selector-action';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { useKibana } from '../hooks/use_kibana';
import { ConnectorSetup } from './connector_setup';
import * as i18n from './translations';

const ELASTIC_LLM_CONNECTOR_ID = 'Elastic-Managed-LLM';

/**
 * Returns the default connector with priority:
 * 1. User's settings default (if set and exists)
 * 2. Elastic Managed LLM
 * 3. First available connector
 */
const getDefaultConnector = (
  connectors: ActionConnector[] | undefined,
  settingsDefaultConnectorId: string | undefined
): ActionConnector | undefined => {
  if (!connectors?.length) {
    return undefined;
  }

  const validConnectors = connectors.filter((connector) => !connector.isMissingSecrets);

  // 1. User's settings default
  if (settingsDefaultConnectorId) {
    const settingsDefault = validConnectors.find((c) => c.id === settingsDefaultConnectorId);
    if (settingsDefault) {
      return settingsDefault;
    }
  }

  // 2. Elastic Managed LLM
  const elasticLLM = validConnectors.find((c) => c.id === ELASTIC_LLM_CONNECTOR_ID);
  if (elasticLLM) {
    return elasticLLM;
  }

  // 3. First available connector
  return validConnectors[0];
};

export interface ConnectorSelectorProps {
  path?: string;
  fullWidth?: boolean;
  isDisabled?: boolean;
  displayFancy?: (label: string, connector?: ActionConnector) => React.ReactNode;
}

export const ConnectorSelector: React.FC<ConnectorSelectorProps> = ({
  path = 'connectorId',
  fullWidth = false,
  isDisabled = false,
  displayFancy,
}) => {
  const { euiTheme } = useEuiTheme();
  const { settings, application } = useKibana().services;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isConnectorModalVisible, setIsConnectorModalVisible] = useState(false);

  const { connectors, isLoading, refetch } = useLoadConnectors();

  const settingsDefaultConnectorId = settings?.client.get<string>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
  );

  // Get default connector using priority: settings default > Elastic LLM > OpenAI/Azure > others
  const defaultConnector = useMemo(
    () => getDefaultConnector(connectors, settingsDefaultConnectorId),
    [connectors, settingsDefaultConnectorId]
  );
  const defaultConnectorId = defaultConnector?.id;

  const { customConnectors, preConfiguredConnectors } = useMemo(
    () =>
      (connectors ?? []).reduce<{
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
    [connectors]
  );

  const handleAddConnectorClick = () => {
    setIsPopoverOpen(false);
    setIsConnectorModalVisible(true);
  };

  const handleManageConnectorsClick = () => {
    setIsPopoverOpen(false);
    application.navigateToApp('management', {
      path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
    });
  };

  const handleConnectorCreated = useCallback(() => {
    setIsConnectorModalVisible(false);
    refetch();
  }, [refetch]);

  const handleCloseModal = () => {
    setIsConnectorModalVisible(false);
  };

  return (
    <>
      <UseField<string> path={path}>
        {(field) => {
          const selectedId = field.value ?? '';

          const connectorExists = some(connectors, ['id', selectedId]);

          // eslint-disable-next-line react-hooks/rules-of-hooks
          useEffect(() => {
            if (!selectedId && defaultConnectorId && !isLoading) {
              field.setValue(defaultConnectorId);
            }
          }, [selectedId, field]);

          const onChangeConnector = (connectorId: string) => {
            field.setValue(connectorId);
            setIsPopoverOpen(false);
          };

          const selectedOrDefaultConnectorId = selectedId || defaultConnectorId;
          const selectedOrDefaultConnector = connectors?.find(
            (connector) => connector.id === selectedOrDefaultConnectorId
          );
          const buttonLabel = selectedOrDefaultConnector?.name ?? i18n.SELECT_CONNECTOR_PLACEHOLDER;

          const panels: EuiContextMenuPanelDescriptor[] = [
            {
              id: 0,
              width: '100%',
              content: (
                <ConnectorSelectable
                  preConfiguredConnectors={preConfiguredConnectors}
                  customConnectors={customConnectors}
                  value={selectedOrDefaultConnector?.id}
                  onValueChange={onChangeConnector}
                  onAddConnectorClick={handleAddConnectorClick}
                  onManageConnectorsClick={handleManageConnectorsClick}
                  defaultConnectorId={settingsDefaultConnectorId}
                  renderOption={(option) => (
                    <EuiFlexGroup
                      justifyContent="spaceBetween"
                      gutterSize="none"
                      alignItems="center"
                    >
                      <EuiFlexItem grow={false} data-test-subj={`connector-${option.label}`}>
                        {option.label}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                />
              ),
            },
          ];

          const input = (
            <EuiButton
              iconType="arrowDown"
              iconSide="right"
              size="s"
              color="text"
              fullWidth={fullWidth}
              onClick={() => setIsPopoverOpen(true)}
              style={{
                borderWidth: fullWidth ? 1 : 0,
                backgroundColor: 'transparent',
              }}
              contentProps={{
                style: {
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: isDisabled ? euiTheme.colors.textDisabled : euiTheme.colors.textPrimary,
                },
              }}
              data-test-subj="connector-selector"
              isDisabled={isDisabled || isLoading}
            >
              {isLoading ? (
                <EuiLoadingSpinner size="s" data-test-subj="connectorSelectorLoading" />
              ) : (
                displayFancy?.(buttonLabel, selectedOrDefaultConnector) ?? buttonLabel
              )}
            </EuiButton>
          );

          if (!connectorExists && customConnectors.length + preConfiguredConnectors.length === 0) {
            return (
              <EuiFlexGroup
                direction="column"
                alignItems="flexEnd"
                data-test-subj="connectorSelectorNoConnectors"
              >
                <EuiFlexItem>
                  <EuiButtonEmpty
                    data-test-subj="addNewConnectorButton"
                    iconType="plusInCircle"
                    isDisabled={isDisabled}
                    size="xs"
                    onClick={handleAddConnectorClick}
                  >
                    {i18n.ADD_CONNECTOR_BUTTON_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }

          return (
            <EuiFlexGroup
              direction="column"
              alignItems="flexEnd"
              data-test-subj="connectorSelectorWrapper"
            >
              <EuiFlexItem>
                <EuiInputPopover
                  input={input}
                  isOpen={isPopoverOpen}
                  closePopover={() => setIsPopoverOpen(false)}
                  panelPaddingSize="none"
                  anchorPosition="downRight"
                  fullWidth={fullWidth}
                  panelMinWidth={300}
                  data-test-subj="connectorSelectorPopover"
                >
                  <EuiContextMenu initialPanelId={0} panels={panels} />
                </EuiInputPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }}
      </UseField>

      {isConnectorModalVisible && (
        <Suspense fallback={null}>
          <ConnectorSetup onClose={handleCloseModal} onConnectorCreated={handleConnectorCreated} />
        </Suspense>
      )}
    </>
  );
};

ConnectorSelector.displayName = 'ConnectorSelector';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  EuiContextMenuPanelDescriptor,
  EuiSelectableProps,
  EuiSelectableOption,
} from '@elastic/eui';
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
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { useLoadConnectors, useKibana } from '..';
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

interface ConnectorData {
  connectors: ActionConnector[] | undefined;
  customConnectors: ConnectorSelectableComponentProps['customConnectors'];
  preConfiguredConnectors: ConnectorSelectableComponentProps['preConfiguredConnectors'];
  defaultConnectorId: string | undefined;
  settingsDefaultConnectorId: string | undefined;
  isLoading: boolean;
}

interface UIState {
  isPopoverOpen: boolean;
  setIsPopoverOpen: (isOpen: boolean) => void;
}

interface ConnectorHandlers {
  onAddConnectorClick: () => void;
  onManageConnectorsClick: () => void;
}

interface ConnectorFieldProps {
  field: FieldHook<string>;
  connectorData: ConnectorData;
  uiState: UIState;
  handlers: ConnectorHandlers;
  fullWidth: boolean;
  isDisabled: boolean;
  displayFancy?: (label: string, connector?: ActionConnector) => React.ReactNode;
}

const ConnectorField: React.FC<ConnectorFieldProps> = ({
  field,
  connectorData,
  uiState,
  handlers,
  fullWidth,
  isDisabled,
  displayFancy,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    connectors,
    customConnectors,
    preConfiguredConnectors,
    defaultConnectorId,
    settingsDefaultConnectorId,
    isLoading,
  } = connectorData;
  const { isPopoverOpen, setIsPopoverOpen } = uiState;
  const { onAddConnectorClick, onManageConnectorsClick } = handlers;

  const selectedId = field.value ?? '';
  const connectorExists = some(connectors, ['id', selectedId]);

  const setFieldValue = field.setValue;

  useEffect(() => {
    if (!selectedId && defaultConnectorId && !isLoading) {
      setFieldValue(defaultConnectorId);
    }
  }, [selectedId, defaultConnectorId, isLoading, setFieldValue]);

  const handleChangeConnector = useCallback(
    (connectorId: string) => {
      setFieldValue(connectorId);
      setIsPopoverOpen(false);
    },
    [setFieldValue, setIsPopoverOpen]
  );

  const handleOpenPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, [setIsPopoverOpen]);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  const selectedOrDefaultConnectorId = selectedId || defaultConnectorId;
  const selectedOrDefaultConnector = useMemo(
    () => connectors?.find((connector) => connector.id === selectedOrDefaultConnectorId),
    [connectors, selectedOrDefaultConnectorId]
  );
  const buttonLabel = selectedOrDefaultConnector?.name ?? i18n.SELECT_CONNECTOR_PLACEHOLDER;

  const renderOption: EuiSelectableProps['renderOption'] = useCallback(
    (option: EuiSelectableOption) => (
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
        <EuiFlexItem grow={false}>{option.label}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        width: '100%',
        content: (
          <ConnectorSelectable
            preConfiguredConnectors={preConfiguredConnectors}
            customConnectors={customConnectors}
            value={selectedOrDefaultConnector?.id}
            onValueChange={handleChangeConnector}
            onAddConnectorClick={onAddConnectorClick}
            onManageConnectorsClick={onManageConnectorsClick}
            defaultConnectorId={settingsDefaultConnectorId}
            renderOption={renderOption}
          />
        ),
      },
    ],
    [
      preConfiguredConnectors,
      customConnectors,
      selectedOrDefaultConnector?.id,
      handleChangeConnector,
      onAddConnectorClick,
      onManageConnectorsClick,
      settingsDefaultConnectorId,
      renderOption,
    ]
  );

  const buttonStyle = useMemo(
    () => ({
      borderWidth: fullWidth ? 1 : 0,
      backgroundColor: 'transparent',
    }),
    [fullWidth]
  );

  const contentPropsStyle = useMemo(
    () => ({
      display: 'flex',
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      alignItems: 'center',
      color: isDisabled ? euiTheme.colors.textDisabled : euiTheme.colors.textPrimary,
    }),
    [isDisabled, euiTheme.colors.textDisabled, euiTheme.colors.textPrimary]
  );

  const input = (
    <EuiButton
      iconType="arrowDown"
      iconSide="right"
      size="s"
      color="text"
      fullWidth={fullWidth}
      onClick={handleOpenPopover}
      style={buttonStyle}
      contentProps={{ style: contentPropsStyle }}
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
      <EuiFlexGroup direction="column" alignItems="flexEnd">
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="addNewConnectorButton"
            iconType="plusInCircle"
            isDisabled={isDisabled}
            size="xs"
            onClick={onAddConnectorClick}
          >
            {i18n.ADD_CONNECTOR_BUTTON_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" alignItems="flexEnd">
      <EuiFlexItem>
        <EuiInputPopover
          input={input}
          isOpen={isPopoverOpen}
          closePopover={handleClosePopover}
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
};

export const ConnectorSelector: React.FC<ConnectorSelectorProps> = ({
  path = 'connectorId',
  fullWidth = false,
  isDisabled = false,
  displayFancy,
}) => {
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

  const handleAddConnectorClick = useCallback(() => {
    setIsPopoverOpen(false);
    setIsConnectorModalVisible(true);
  }, []);

  const handleManageConnectorsClick = useCallback(() => {
    setIsPopoverOpen(false);
    application.navigateToApp('management', {
      path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
    });
  }, [application]);

  const handleConnectorCreated = useCallback(() => {
    setIsConnectorModalVisible(false);
    refetch();
  }, [refetch]);

  const handleCloseModal = useCallback(() => {
    setIsConnectorModalVisible(false);
  }, []);

  const connectorData: ConnectorData = useMemo(
    () => ({
      connectors,
      customConnectors,
      preConfiguredConnectors,
      defaultConnectorId,
      settingsDefaultConnectorId,
      isLoading,
    }),
    [
      connectors,
      customConnectors,
      preConfiguredConnectors,
      defaultConnectorId,
      settingsDefaultConnectorId,
      isLoading,
    ]
  );

  const uiState: UIState = useMemo(
    () => ({
      isPopoverOpen,
      setIsPopoverOpen,
    }),
    [isPopoverOpen, setIsPopoverOpen]
  );

  const handlers: ConnectorHandlers = useMemo(
    () => ({
      onAddConnectorClick: handleAddConnectorClick,
      onManageConnectorsClick: handleManageConnectorsClick,
    }),
    [handleAddConnectorClick, handleManageConnectorsClick]
  );

  return (
    <>
      <UseField<string> path={path}>
        {(field) => (
          <ConnectorField
            field={field}
            connectorData={connectorData}
            uiState={uiState}
            handlers={handlers}
            fullWidth={fullWidth}
            isDisabled={isDisabled}
            displayFancy={displayFancy}
          />
        )}
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

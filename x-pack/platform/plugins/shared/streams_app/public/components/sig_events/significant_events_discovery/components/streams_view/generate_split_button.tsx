/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCallOut,
  EuiContextMenu,
  EuiSelectable,
  EuiSplitButton,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import type { InferenceConnector } from '@kbn/inference-common';
import type { OnboardingStep } from '@kbn/streams-schema';
import React, { useCallback, useMemo, useState } from 'react';
import { ConnectorIcon } from '../../../../connector_list_button/connector_icon';
import {
  CONNECTOR_LOAD_ERROR,
  DEFAULT_MODEL_BADGE_LABEL,
  GENERATE_BUTTON_LABEL,
  GENERATE_FEATURES_BUTTON_LABEL,
  GENERATE_FEATURES_TOOLTIP,
  GENERATE_QUERIES_BUTTON_LABEL,
  GENERATE_QUERIES_TOOLTIP,
  MODEL_SELECTION_PANEL_TITLE,
  GENERATE_CONFIG_ARIA_LABEL,
} from './translations';
import { useModelSettingsUrl } from '../../../../../hooks/use_model_settings_url';
import { buildConnectorMenuItem, buildModelSettingsMenuItems } from './context_menu_helpers';

export interface OnboardingConfig {
  steps: OnboardingStep[];
  connectors: {
    features?: string;
    queries?: string;
  };
}

interface GenerateSplitButtonProps {
  config: OnboardingConfig;
  allConnectors: InferenceConnector[];
  connectorError: Error | undefined;
  featuresResolvedConnectorId: string | undefined;
  queriesResolvedConnectorId: string | undefined;
  onConfigChange: (config: OnboardingConfig) => void;
  onRun: () => void;
  onRunFeaturesOnly: () => void;
  onRunQueriesOnly: () => void;
  isRunDisabled: boolean;
  isConfigDisabled: boolean;
}

interface ConnectorSubPanelProps {
  connectors: InferenceConnector[];
  resolvedConnectorId: string | undefined;
  selectedConnectorId: string | undefined;
  onSelect: (connectorId: string) => void;
}

export const ConnectorSubPanel = ({
  connectors,
  resolvedConnectorId,
  selectedConnectorId,
  onSelect,
}: ConnectorSubPanelProps) => {
  const options = useMemo<EuiSelectableOption[]>(
    () =>
      connectors.map((connector) => ({
        label: connector.name,
        key: connector.connectorId,
        checked: connector.connectorId === selectedConnectorId ? ('on' as const) : undefined,
        prepend: <ConnectorIcon connectorName={connector.name} />,
        append:
          connector.connectorId === resolvedConnectorId ? (
            <EuiBadge color="hollow">{DEFAULT_MODEL_BADGE_LABEL}</EuiBadge>
          ) : undefined,
      })),
    [connectors, selectedConnectorId, resolvedConnectorId]
  );

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions.find((o) => o.checked === 'on');
      if (selected?.key) onSelect(selected.key);
    },
    [onSelect]
  );

  return (
    <EuiSelectable singleSelection options={options} onChange={handleChange}>
      {(list) => list}
    </EuiSelectable>
  );
};

export const GenerateSplitButton = ({
  config,
  allConnectors,
  connectorError,
  featuresResolvedConnectorId,
  queriesResolvedConnectorId,
  onConfigChange,
  onRun,
  onRunFeaturesOnly,
  onRunQueriesOnly,
  isRunDisabled,
  isConfigDisabled,
}: GenerateSplitButtonProps) => {
  const [isOpen, { off: close, toggle }] = useBoolean(false);
  const [menuResetKey, setMenuResetKey] = useState(0);
  const popoverId = useGeneratedHtmlId({ prefix: 'generateSplitButton' });
  const managementUrl = useModelSettingsUrl();

  const resetMenu = useCallback(() => setMenuResetKey((k) => k + 1), []);

  const handleClose = useCallback(() => {
    close();
    resetMenu();
  }, [close, resetMenu]);

  const featuresConnector = allConnectors.find((c) => c.connectorId === config.connectors.features);
  const queriesConnector = allConnectors.find((c) => c.connectorId === config.connectors.queries);

  const handleRunFeatures = useCallback(() => {
    close();
    onRunFeaturesOnly();
  }, [close, onRunFeaturesOnly]);

  const handleRunQueries = useCallback(() => {
    close();
    onRunQueriesOnly();
  }, [close, onRunQueriesOnly]);

  const handleFeaturesConnectorSelect = useCallback(
    (connectorId: string) => {
      onConfigChange({ ...config, connectors: { ...config.connectors, features: connectorId } });
      resetMenu();
    },
    [config, onConfigChange, resetMenu]
  );

  const handleQueriesConnectorSelect = useCallback(
    (connectorId: string) => {
      onConfigChange({ ...config, connectors: { ...config.connectors, queries: connectorId } });
      resetMenu();
    },
    [config, onConfigChange, resetMenu]
  );

  const contextMenuPanels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: GENERATE_FEATURES_BUTTON_LABEL,
            onClick: handleRunFeatures,
            disabled: isRunDisabled,
            toolTipContent: GENERATE_FEATURES_TOOLTIP,
            toolTipProps: { position: 'right' as const },
          },
          buildConnectorMenuItem(featuresConnector, 1),
          { isSeparator: true as const },
          {
            name: GENERATE_QUERIES_BUTTON_LABEL,
            onClick: handleRunQueries,
            disabled: isRunDisabled,
            toolTipContent: GENERATE_QUERIES_TOOLTIP,
            toolTipProps: { position: 'right' as const },
          },
          buildConnectorMenuItem(queriesConnector, 2),
          ...buildModelSettingsMenuItems(managementUrl, handleClose),
        ],
      },
      {
        id: 1,
        title: MODEL_SELECTION_PANEL_TITLE,
        width: 240,
        content: (
          <ConnectorSubPanel
            connectors={allConnectors}
            resolvedConnectorId={featuresResolvedConnectorId}
            selectedConnectorId={config.connectors.features}
            onSelect={handleFeaturesConnectorSelect}
          />
        ),
      },
      {
        id: 2,
        title: MODEL_SELECTION_PANEL_TITLE,
        width: 240,
        content: (
          <ConnectorSubPanel
            connectors={allConnectors}
            resolvedConnectorId={queriesResolvedConnectorId}
            selectedConnectorId={config.connectors.queries}
            onSelect={handleQueriesConnectorSelect}
          />
        ),
      },
    ],
    [
      handleRunFeatures,
      handleRunQueries,
      isRunDisabled,
      featuresConnector,
      queriesConnector,
      managementUrl,
      handleClose,
      allConnectors,
      featuresResolvedConnectorId,
      queriesResolvedConnectorId,
      config.connectors.features,
      config.connectors.queries,
      handleFeaturesConnectorSelect,
      handleQueriesConnectorSelect,
    ]
  );

  return (
    <EuiSplitButton size="m" data-test-subj="significant_events_generate_split_button">
      <EuiSplitButton.ActionPrimary
        onClick={onRun}
        isDisabled={isRunDisabled}
        iconType="radar"
        data-test-subj="significant_events_onboard_streams_button"
      >
        {GENERATE_BUTTON_LABEL}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="arrowDown"
        aria-label={GENERATE_CONFIG_ARIA_LABEL}
        data-test-subj="significant_events_onboarding_config_trigger"
        isDisabled={isConfigDisabled}
        onClick={toggle}
        popoverProps={{
          id: popoverId,
          isOpen,
          closePopover: handleClose,
          anchorPosition: 'downRight',
          panelPaddingSize: 'none',
          children: connectorError ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={CONNECTOR_LOAD_ERROR}
              css={{ margin: 8 }}
            />
          ) : (
            <EuiContextMenu key={menuResetKey} initialPanelId={0} panels={contextMenuPanels} />
          ),
        }}
      />
    </EuiSplitButton>
  );
};

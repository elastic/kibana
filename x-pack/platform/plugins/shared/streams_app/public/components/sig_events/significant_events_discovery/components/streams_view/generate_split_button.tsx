/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import React, { useCallback, useMemo } from 'react';
import {
  CONNECTOR_LOAD_ERROR,
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
import { ConnectorSubPanel } from './connector_sub_panel';
import type { OnboardingConfig } from './types';
import { ContextMenuSplitButton } from './context_menu_split_button';
import type { MenuHelpers } from './context_menu_split_button';

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
  const managementUrl = useModelSettingsUrl();

  const featuresConnector = useMemo(
    () => allConnectors.find((c) => c.connectorId === config.connectors.features),
    [allConnectors, config.connectors.features]
  );
  const queriesConnector = useMemo(
    () => allConnectors.find((c) => c.connectorId === config.connectors.queries),
    [allConnectors, config.connectors.queries]
  );

  const buildConnectorSubPanel = useCallback(
    ({
      panelId,
      connectorKey,
      resolvedId,
      resetMenu,
    }: {
      panelId: number;
      connectorKey: keyof OnboardingConfig['connectors'];
      resolvedId: string | undefined;
      resetMenu: () => void;
    }) => ({
      id: panelId,
      title: MODEL_SELECTION_PANEL_TITLE,
      width: 240,
      content: (
        <ConnectorSubPanel
          connectors={allConnectors}
          resolvedConnectorId={resolvedId}
          selectedConnectorId={config.connectors[connectorKey]}
          onSelect={(connectorId: string) => {
            onConfigChange({
              ...config,
              connectors: { ...config.connectors, [connectorKey]: connectorId },
            });
            resetMenu();
          }}
        />
      ),
    }),
    [allConnectors, config, onConfigChange]
  );

  const buildPanels = useCallback(
    ({ resetMenu, closeMenu }: MenuHelpers) => [
      {
        id: 0,
        items: [
          {
            name: GENERATE_FEATURES_BUTTON_LABEL,
            onClick: () => {
              closeMenu();
              onRunFeaturesOnly();
            },
            disabled: isRunDisabled,
            toolTipContent: GENERATE_FEATURES_TOOLTIP,
            toolTipProps: { position: 'right' as const },
          },
          buildConnectorMenuItem(featuresConnector, 1),
          { isSeparator: true as const },
          {
            name: GENERATE_QUERIES_BUTTON_LABEL,
            onClick: () => {
              closeMenu();
              onRunQueriesOnly();
            },
            disabled: isRunDisabled,
            toolTipContent: GENERATE_QUERIES_TOOLTIP,
            toolTipProps: { position: 'right' as const },
          },
          buildConnectorMenuItem(queriesConnector, 2),
          ...buildModelSettingsMenuItems(managementUrl, closeMenu),
        ],
      },
      buildConnectorSubPanel({
        panelId: 1,
        connectorKey: 'features',
        resolvedId: featuresResolvedConnectorId,
        resetMenu,
      }),
      buildConnectorSubPanel({
        panelId: 2,
        connectorKey: 'queries',
        resolvedId: queriesResolvedConnectorId,
        resetMenu,
      }),
    ],
    [
      isRunDisabled,
      featuresConnector,
      queriesConnector,
      managementUrl,
      featuresResolvedConnectorId,
      queriesResolvedConnectorId,
      buildConnectorSubPanel,
      onRunFeaturesOnly,
      onRunQueriesOnly,
    ]
  );

  return (
    <ContextMenuSplitButton
      primaryLabel={GENERATE_BUTTON_LABEL}
      primaryIconType="radar"
      onPrimaryClick={onRun}
      isPrimaryDisabled={isRunDisabled}
      primaryDataTestSubj="significant_events_onboard_streams_button"
      secondaryAriaLabel={GENERATE_CONFIG_ARIA_LABEL}
      isSecondaryDisabled={isConfigDisabled}
      secondaryDataTestSubj="significant_events_onboarding_config_trigger"
      buildPanels={buildPanels}
      error={connectorError}
      errorTitle={CONNECTOR_LOAD_ERROR}
      data-test-subj="significant_events_generate_split_button"
    />
  );
};

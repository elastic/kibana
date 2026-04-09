/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import React, { useCallback, useMemo } from 'react';
import { ConnectorSubPanel } from './connector_sub_panel';
import {
  CONNECTOR_LOAD_ERROR,
  DISCOVER_INSIGHTS_BUTTON_LABEL,
  DISCOVER_INSIGHTS_CONFIG_ARIA_LABEL,
  MODEL_SELECTION_PANEL_TITLE,
} from './translations';
import { useModelSettingsUrl } from '../../../../../hooks/use_model_settings_url';
import { buildConnectorMenuItem, buildModelSettingsMenuItems } from './context_menu_helpers';
import { ContextMenuSplitButton } from './context_menu_split_button';
import type { MenuHelpers } from './context_menu_split_button';

interface InsightsSplitButtonProps {
  allConnectors: InferenceConnector[];
  connectorError: Error | undefined;
  resolvedConnectorId: string | undefined;
  displayConnectorId: string | undefined;
  onConnectorChange: (connectorId: string) => void;
  onRun: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const InsightsSplitButton = ({
  allConnectors,
  connectorError,
  resolvedConnectorId,
  displayConnectorId,
  onConnectorChange,
  onRun,
  isLoading,
  isDisabled,
}: InsightsSplitButtonProps) => {
  const managementUrl = useModelSettingsUrl();

  const discoveryConnector = useMemo(
    () => allConnectors.find((c) => c.connectorId === displayConnectorId),
    [allConnectors, displayConnectorId]
  );

  const buildPanels = useCallback(
    ({ resetMenu, closeMenu }: MenuHelpers) => [
      {
        id: 0,
        items: [
          buildConnectorMenuItem(discoveryConnector, 1),
          ...buildModelSettingsMenuItems(managementUrl, closeMenu),
        ],
      },
      {
        id: 1,
        title: MODEL_SELECTION_PANEL_TITLE,
        width: 240,
        content: (
          <ConnectorSubPanel
            connectors={allConnectors}
            resolvedConnectorId={resolvedConnectorId}
            selectedConnectorId={displayConnectorId}
            onSelect={(connectorId: string) => {
              onConnectorChange(connectorId);
              resetMenu();
            }}
          />
        ),
      },
    ],
    [
      discoveryConnector,
      managementUrl,
      allConnectors,
      resolvedConnectorId,
      displayConnectorId,
      onConnectorChange,
    ]
  );

  return (
    <ContextMenuSplitButton
      primaryLabel={DISCOVER_INSIGHTS_BUTTON_LABEL}
      onPrimaryClick={onRun}
      isPrimaryDisabled={isDisabled || isLoading}
      primaryDataTestSubj="significant_events_discover_insights_button"
      secondaryAriaLabel={DISCOVER_INSIGHTS_CONFIG_ARIA_LABEL}
      secondaryDataTestSubj="significant_events_insights_connector_trigger"
      buildPanels={buildPanels}
      error={connectorError}
      errorTitle={CONNECTOR_LOAD_ERROR}
      color="text"
      isLoading={isLoading}
      data-test-subj="significant_events_discover_insights_split_button"
    />
  );
};

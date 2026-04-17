/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import React, { useCallback, useMemo } from 'react';
import {
  DISCOVER_INSIGHTS_BUTTON_LABEL,
  DISCOVER_INSIGHTS_CONFIG_ARIA_LABEL,
} from './translations';
import { CONNECTOR_LOAD_ERROR } from '../shared/translations';
import {
  buildConnectorMenuItem,
  buildConnectorSelectionPanel,
} from '../shared/context_menu_helpers';
import { ContextMenuSplitButton } from '../shared/context_menu_split_button';
import type { MenuHelpers } from '../shared/context_menu_split_button';

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
  const discoveryConnector = useMemo(
    () => allConnectors.find((c) => c.connectorId === displayConnectorId),
    [allConnectors, displayConnectorId]
  );

  const buildPanels = useCallback(
    ({ resetMenu }: MenuHelpers) => [
      {
        items: [buildConnectorMenuItem({ connector: discoveryConnector, panelId: 1 })],
      },
      buildConnectorSelectionPanel({
        connectors: allConnectors,
        resolvedConnectorId,
        selectedConnectorId: displayConnectorId,
        onSelect: (connectorId) => {
          onConnectorChange(connectorId);
          resetMenu();
        },
      }),
    ],
    [discoveryConnector, allConnectors, resolvedConnectorId, displayConnectorId, onConnectorChange]
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

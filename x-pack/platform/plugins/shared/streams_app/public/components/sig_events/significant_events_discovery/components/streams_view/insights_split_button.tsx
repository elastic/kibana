/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiContextMenu, EuiSplitButton, useGeneratedHtmlId } from '@elastic/eui';
import type { InferenceConnector } from '@kbn/inference-common';
import { useBoolean } from '@kbn/react-hooks';
import React, { useCallback, useMemo, useState } from 'react';
import { ConnectorSubPanel } from './generate_split_button';
import {
  CONNECTOR_LOAD_ERROR,
  DISCOVER_INSIGHTS_BUTTON_LABEL,
  DISCOVER_INSIGHTS_CONFIG_ARIA_LABEL,
  MODEL_SELECTION_PANEL_TITLE,
} from './translations';
import { useModelSettingsUrl } from '../../../../../hooks/use_model_settings_url';
import { buildConnectorMenuItem, buildModelSettingsMenuItems } from './context_menu_helpers';

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
  const [isOpen, { off: close, toggle }] = useBoolean(false);
  const [menuResetKey, setMenuResetKey] = useState(0);
  const popoverId = useGeneratedHtmlId({ prefix: 'insightsConfigPopover' });
  const managementUrl = useModelSettingsUrl();

  const resetMenu = useCallback(() => setMenuResetKey((k) => k + 1), []);

  const handleClose = useCallback(() => {
    close();
    resetMenu();
  }, [close, resetMenu]);

  const handleConnectorSelect = useCallback(
    (connectorId: string) => {
      onConnectorChange(connectorId);
      resetMenu();
    },
    [onConnectorChange, resetMenu]
  );

  const discoveryConnector = allConnectors.find((c) => c.connectorId === displayConnectorId);

  const contextMenuPanels = useMemo(
    () => [
      {
        id: 0,
        items: [
          buildConnectorMenuItem(discoveryConnector, 1),
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
            resolvedConnectorId={resolvedConnectorId}
            selectedConnectorId={displayConnectorId}
            onSelect={handleConnectorSelect}
          />
        ),
      },
    ],
    [
      discoveryConnector,
      managementUrl,
      handleClose,
      allConnectors,
      resolvedConnectorId,
      displayConnectorId,
      handleConnectorSelect,
    ]
  );

  return (
    <EuiSplitButton
      size="m"
      color="text"
      isLoading={isLoading}
      data-test-subj="significant_events_discover_insights_split_button"
    >
      <EuiSplitButton.ActionPrimary
        onClick={onRun}
        isDisabled={isDisabled}
        data-test-subj="significant_events_discover_insights_button"
      >
        {DISCOVER_INSIGHTS_BUTTON_LABEL}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="arrowDown"
        aria-label={DISCOVER_INSIGHTS_CONFIG_ARIA_LABEL}
        data-test-subj="significant_events_insights_connector_trigger"
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

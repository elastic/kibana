/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import { EuiPopover, EuiButtonEmpty, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  ConnectorSelectable,
  type ConnectorSelectableComponentProps,
} from '@kbn/ai-assistant-connector-selector-action';
import { useLoadConnectors } from '@kbn/elastic-assistant';
import { useNavigation } from '../../hooks/use_navigation';
import { useKibana } from '../../hooks/use_kibana';
import { useDefaultConnector } from '../../hooks/chat/use_default_connector';

interface ConnectorSelectorProps {
  selectedConnectorId?: string;
  onSelectConnector: (connectorId: string) => void;
  defaultConnectorId?: string;
}

export const ConnectorSelector: React.FC<ConnectorSelectorProps> = ({
  selectedConnectorId,
  onSelectConnector,
  defaultConnectorId,
}) => {
  const { euiTheme } = useEuiTheme();
  const { navigateToManageConnectors } = useNavigation();
  const {
    services: { http, settings },
  } = useKibana();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const { data: aiConnectors, isLoading } = useLoadConnectors({
    http,
    settings,
    inferenceEnabled: true,
  });

  const connectors = useMemo(() => aiConnectors ?? [], [aiConnectors]);

  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const panelStyles = css`
    inline-size: calc(${euiTheme.size.xxl} * 8);
  `;

  const { preConfiguredConnectors, customConnectors } = useMemo(() => {
    const preConfigured: ConnectorSelectableComponentProps['preConfiguredConnectors'] = [];
    const custom: ConnectorSelectableComponentProps['customConnectors'] = [];

    connectors.forEach((connector) => {
      const option = {
        value: connector.id,
        label: connector.name,
      };

      if (connector.isPreconfigured) {
        preConfigured.push(option);
      } else {
        custom.push(option);
      }
    });

    return { preConfiguredConnectors: preConfigured, customConnectors: custom };
  }, [connectors]);

  const initialConnectorId = useDefaultConnector({
    connectors,
    defaultConnectorId,
  });

  const selectedConnector = connectors.find((c) => c.id === selectedConnectorId);

  useEffect(() => {
    if (!isLoading && initialConnectorId) {
      // No user preference set
      if (!selectedConnectorId) {
        onSelectConnector(initialConnectorId);
      }
      // User preference is set but connector is not available in the list.
      // Scenario: the connector was deleted or admin changed GenAI settings
      else if (selectedConnectorId && !selectedConnector) {
        onSelectConnector(initialConnectorId);
      }
    }
  }, [selectedConnectorId, selectedConnector, isLoading, initialConnectorId, onSelectConnector]);

  const selectedConnectorName = selectedConnector?.name || selectedConnectorId;

  const buttonLabel =
    selectedConnectorName ||
    i18n.translate('xpack.onechat.connectorSelector.noConnector', {
      defaultMessage: 'No connector',
    });

  const button = (
    <EuiButtonEmpty
      iconType={isLoading ? undefined : 'arrowDown'}
      iconSide="right"
      onClick={togglePopover}
      disabled={isLoading || connectors.length === 0}
      data-test-subj="onechatConnectorSelectorButton"
      aria-haspopup="menu"
      aria-label={i18n.translate('xpack.onechat.connectorSelector.selectConnector', {
        defaultMessage: 'Select connector',
      })}
    >
      {isLoading ? <EuiLoadingSpinner size="s" /> : buttonLabel}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      panelProps={{ css: panelStyles }}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="upLeft"
    >
      <ConnectorSelectable
        value={selectedConnectorId}
        onValueChange={(connectorId) => {
          onSelectConnector(connectorId);
          closePopover();
        }}
        customConnectors={customConnectors}
        preConfiguredConnectors={preConfiguredConnectors}
        defaultConnectorId={defaultConnectorId}
        data-test-subj="onechatConnectorSelector"
        onAddConnectorClick={() => navigateToManageConnectors()}
      />
    </EuiPopover>
  );
};

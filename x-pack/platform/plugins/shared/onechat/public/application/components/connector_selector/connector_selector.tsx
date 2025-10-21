/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPopover, EuiButtonEmpty, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  ConnectorSelectable,
  type ConnectorSelectableComponentProps,
} from '@kbn/ai-assistant-connector-selector-action';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { useNavigation } from '../../hooks/use_navigation';

interface ConnectorSelectorProps {
  connectors: InferenceConnector[];
  selectedConnectorId?: string;
  onSelectConnector: (connectorId: string) => void;
  isLoading?: boolean;
  defaultConnectorId?: string;
}

export const ConnectorSelector: React.FC<ConnectorSelectorProps> = ({
  connectors,
  selectedConnectorId,
  onSelectConnector,
  isLoading = false,
  defaultConnectorId,
}) => {
  const { euiTheme } = useEuiTheme();
  const { navigateToManageConnectors } = useNavigation();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const panelStyles = css`
    inline-size: calc(${euiTheme.size.xxl} * 8);
  `;

  // Split connectors into preconfigured and custom
  const { preConfiguredConnectors, customConnectors } = useMemo(() => {
    const preConfigured: ConnectorSelectableComponentProps['preConfiguredConnectors'] = [];
    const custom: ConnectorSelectableComponentProps['customConnectors'] = [];

    connectors.forEach((connector) => {
      const option = {
        value: connector.connectorId,
        label: connector.name || connector.connectorId,
      };

      // Consider inference type connectors as "preconfigured"
      if (connector.type === InferenceConnectorType.Inference) {
        preConfigured.push(option);
      } else {
        custom.push(option);
      }
    });

    return { preConfiguredConnectors: preConfigured, customConnectors: custom };
  }, [connectors]);

  const selectedConnector = connectors.find((c) => c.connectorId === selectedConnectorId);
  const selectedConnectorName = selectedConnector?.name || selectedConnector?.connectorId;

  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  const button = (
    <EuiButtonEmpty
      iconType="arrowDown"
      iconSide="right"
      onClick={togglePopover}
      disabled={connectors.length === 0}
      data-test-subj="onechatConnectorSelectorButton"
      aria-haspopup="menu"
      aria-label={i18n.translate('xpack.onechat.connectorSelector.selectConnector', {
        defaultMessage: 'Select connector',
      })}
    >
      {selectedConnectorName ||
        i18n.translate('xpack.onechat.connectorSelector.noConnector', {
          defaultMessage: 'No connector',
        })}
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

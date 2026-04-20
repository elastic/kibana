/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { ConnectorIcon } from './connector_icon';

interface ConnectorPickerPopoverProps {
  connectors: UseGenAIConnectorsResult;
  isOpen: boolean;
  onClose: () => void;
  button: React.ReactElement;
  anchorPosition?: 'downLeft' | 'downRight' | 'upLeft' | 'upRight';
  id?: string;
  'aria-label'?: string;
}

export const ConnectorPickerPopover = ({
  connectors,
  isOpen,
  onClose,
  button,
  anchorPosition,
  id,
  'aria-label': ariaLabel,
}: ConnectorPickerPopoverProps) => {
  return (
    <EuiPopover
      id={id}
      isOpen={isOpen}
      closePopover={onClose}
      button={button}
      panelPaddingSize="none"
      anchorPosition={anchorPosition}
      aria-label={ariaLabel}
    >
      <EuiContextMenuPanel
        size="s"
        items={connectors.connectors?.map((connector) => (
          <EuiContextMenuItem
            key={connector.connectorId}
            icon={connector.connectorId === connectors.selectedConnector ? 'check' : 'empty'}
            onClick={() => {
              connectors.selectConnector(connector.connectorId);
              onClose();
            }}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <ConnectorIcon connectorName={connector.name} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{connector.name}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};

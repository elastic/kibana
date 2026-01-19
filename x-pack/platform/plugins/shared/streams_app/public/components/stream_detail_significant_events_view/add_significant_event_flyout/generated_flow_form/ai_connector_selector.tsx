/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexItem,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UseGenAIConnectorsResult } from '@kbn/observability-ai-assistant-plugin/public/hooks/use_genai_connectors';
import { useBoolean } from '@kbn/react-hooks';
import React from 'react';

export function AIConnectorSelector({
  genAiConnectors,
  disabled,
}: {
  genAiConnectors: UseGenAIConnectorsResult;
  disabled: boolean;
}) {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });

  if (!genAiConnectors.connectors || genAiConnectors.connectors.length <= 1) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        id={splitButtonPopoverId}
        isOpen={isPopoverOpen}
        closePopover={() => closePopover()}
        button={
          <EuiButtonIcon
            disabled={disabled}
            data-test-subj="streamsAppSignificantEventsAiPickConnectorButton"
            onClick={togglePopover}
            display="base"
            size="s"
            iconType="boxesVertical"
            aria-label={i18n.translate(
              'xpack.streams.addSignificantEventFlyout.aiFlow.pickConnectorLabel',
              { defaultMessage: 'Select AI connector' }
            )}
          />
        }
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          items={genAiConnectors.connectors.map((connector) => (
            <EuiContextMenuItem
              key={connector.id}
              icon={connector.id === genAiConnectors.selectedConnector ? 'check' : 'empty'}
              onClick={() => {
                genAiConnectors.selectConnector(connector.id);
                closePopover();
              }}
            >
              {connector.name}
            </EuiContextMenuItem>
          ))}
        />
      </EuiPopover>
    </EuiFlexItem>
  );
}

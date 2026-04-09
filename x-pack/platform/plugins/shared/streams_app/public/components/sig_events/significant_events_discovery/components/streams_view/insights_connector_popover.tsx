/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSuperSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InferenceConnector } from '@kbn/inference-common';
import { useBoolean } from '@kbn/react-hooks';
import React, { useCallback, useMemo } from 'react';
import { buildConnectorSelectOptions, getEffectiveConnectorId } from './connector_select_options';
import {
  CONNECTOR_LOAD_ERROR,
  INSIGHTS_CONNECTOR_POPOVER_ARIA_LABEL,
  INSIGHTS_CONNECTOR_POPOVER_TITLE,
  RUN_BUTTON_LABEL,
} from './translations';

interface InsightsConnectorPopoverProps {
  displayConnectorId: string | undefined;
  connectorList: InferenceConnector[];
  connectorError: Error | undefined;
  onConnectorChange: (connectorId: string) => void;
  onRun: () => void;
  isRunDisabled: boolean;
}

const popoverContentStyle = css`
  min-width: 280px;
`;

export const InsightsConnectorPopover = ({
  displayConnectorId,
  connectorList,
  connectorError,
  onConnectorChange,
  onRun,
  isRunDisabled,
}: InsightsConnectorPopoverProps) => {
  const [isOpen, { off: close, toggle }] = useBoolean(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'insightsConnectorPopover' });
  const selectId = useGeneratedHtmlId({ prefix: 'insightsConnectorSelect' });

  const connectorOptions = useMemo(
    () => buildConnectorSelectOptions(connectorList),
    [connectorList]
  );
  const effectiveConnectorId = useMemo(
    () => getEffectiveConnectorId(displayConnectorId, connectorOptions),
    [displayConnectorId, connectorOptions]
  );

  const handleRun = useCallback(() => {
    close();
    onRun();
  }, [close, onRun]);

  return (
    <EuiPopover
      id={popoverId}
      aria-label={INSIGHTS_CONNECTOR_POPOVER_ARIA_LABEL}
      isOpen={isOpen}
      closePopover={close}
      button={
        <EuiButtonIcon
          data-test-subj="significant_events_insights_connector_trigger"
          onClick={toggle}
          display="base"
          size="xs"
          iconType="arrowDown"
          aria-label={INSIGHTS_CONNECTOR_POPOVER_ARIA_LABEL}
        />
      }
      panelPaddingSize="m"
    >
      <EuiPopoverTitle paddingSize="s">{INSIGHTS_CONNECTOR_POPOVER_TITLE}</EuiPopoverTitle>
      <EuiFlexGroup direction="column" gutterSize="m" css={popoverContentStyle}>
        {connectorError ? (
          <EuiFlexItem>
            <EuiCallOut announceOnMount color="danger" size="s" title={CONNECTOR_LOAD_ERROR} />
          </EuiFlexItem>
        ) : (
          effectiveConnectorId &&
          connectorOptions.length > 0 && (
            <EuiFlexItem>
              <EuiFormRow display="rowCompressed" aria-label={INSIGHTS_CONNECTOR_POPOVER_TITLE}>
                <EuiSuperSelect
                  id={selectId}
                  options={connectorOptions}
                  valueOfSelected={effectiveConnectorId}
                  onChange={onConnectorChange}
                  compressed
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
          )
        )}
        <EuiFlexItem>
          <EuiButton
            size="s"
            fill
            onClick={handleRun}
            disabled={isRunDisabled}
            data-test-subj="significant_events_insights_connector_run_button"
          >
            {RUN_BUTTON_LABEL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};

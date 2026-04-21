/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { useConnectorsActions } from '../../../context/connectors_provider';
import { useKibana } from '../../../hooks/use_kibana';
import { labels } from '../../../utils/i18n';

export interface ConnectorsTableHeaderProps {
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  connectors: ConnectorItem[];
  total: number;
  selectedConnectors: ConnectorItem[];
  setSelectedConnectors: (connectors: ConnectorItem[]) => void;
}

export const ConnectorsTableHeader = ({
  isLoading,
  pageIndex,
  pageSize,
  connectors,
  total,
  selectedConnectors,
  setSelectedConnectors,
}: ConnectorsTableHeaderProps) => {
  const { bulkDeleteConnectors } = useConnectorsActions();
  const {
    services: { application },
  } = useKibana();
  const canDelete = application.capabilities.actions?.delete === true;

  const selectAll = useCallback(() => {
    setSelectedConnectors(connectors);
  }, [setSelectedConnectors, connectors]);

  const clearSelection = useCallback(() => {
    setSelectedConnectors([]);
  }, [setSelectedConnectors]);

  const deleteSelection = useCallback(() => {
    bulkDeleteConnectors(selectedConnectors);
  }, [bulkDeleteConnectors, selectedConnectors]);

  return (
    <EuiSkeletonLoading
      isLoading={isLoading}
      loadingContent={
        <EuiSkeletonText
          css={css`
            display: inline-block;
            width: 200px;
          `}
          lines={1}
          size="xs"
        />
      }
      loadedContent={
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          css={css`
            min-height: 24px;
          `}
        >
          {connectors.length > 0 && (
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.agentBuilder.connectors.connectorsTableSummary"
                defaultMessage="Showing {start}-{end} of {total} {total, plural, one {Connector} other {Connectors}}"
                values={{
                  start: <strong>{pageIndex * pageSize + 1}</strong>,
                  end: <strong>{Math.min((pageIndex + 1) * pageSize, connectors.length)}</strong>,
                  total,
                }}
              />
            </EuiText>
          )}
          {selectedConnectors.length > 0 && (
            <EuiFlexGroup gutterSize="none">
              {canDelete && (
                <EuiButtonEmpty
                  aria-label={labels.connectors.deleteSelectedConnectorsButtonLabel(
                    selectedConnectors.length
                  )}
                  data-test-subj="agentBuilderConnectorsBulkDeleteButton"
                  iconType="trash"
                  iconSize="m"
                  size="xs"
                  color="danger"
                  onClick={deleteSelection}
                  css={({ euiTheme }) => ({
                    fontWeight: euiTheme.font.weight.semiBold,
                  })}
                >
                  {labels.connectors.deleteSelectedConnectorsButtonLabel(selectedConnectors.length)}
                </EuiButtonEmpty>
              )}
              <EuiButtonEmpty
                aria-label={labels.connectors.selectAllConnectorsButtonLabel}
                data-test-subj="agentBuilderConnectorsSelectAllButton"
                iconType="pagesSelect"
                iconSize="m"
                size="xs"
                onClick={selectAll}
                css={({ euiTheme }) => ({
                  fontWeight: euiTheme.font.weight.semiBold,
                })}
              >
                {labels.connectors.selectAllConnectorsButtonLabel}
              </EuiButtonEmpty>
              <EuiButtonEmpty
                aria-label={labels.connectors.clearSelectionButtonLabel}
                data-test-subj="agentBuilderConnectorsClearSelectionButton"
                iconType="cross"
                iconSize="m"
                size="xs"
                onClick={clearSelection}
                css={({ euiTheme }) => ({
                  fontWeight: euiTheme.font.weight.semiBold,
                })}
              >
                {labels.connectors.clearSelectionButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
      }
    />
  );
};

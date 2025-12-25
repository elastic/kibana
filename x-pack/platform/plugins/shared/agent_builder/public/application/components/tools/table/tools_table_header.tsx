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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ToolDefinition } from '@kbn/agent-builder-common';
import React, { useCallback } from 'react';
import { useToolsActions } from '../../../context/tools_provider';
import { labels } from '../../../utils/i18n';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';

export interface ToolsTableHeaderProps {
  isLoading: boolean;
  pageIndex: number;
  tools: ToolDefinition[];
  total: number;
  selectedTools: ToolDefinition[];
  setSelectedTools: (tools: ToolDefinition[]) => void;
}

export const ToolsTableHeader = ({
  isLoading,
  pageIndex,
  tools,
  total,
  selectedTools,
  setSelectedTools,
}: ToolsTableHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  const { bulkDeleteTools } = useToolsActions();
  const { manageTools } = useUiPrivileges();

  const selectAll = useCallback(() => {
    setSelectedTools(tools.filter((tool) => !tool.readonly));
  }, [setSelectedTools, tools]);

  const clearSelection = useCallback(() => {
    setSelectedTools([]);
  }, [setSelectedTools]);

  const deleteSelection = useCallback(() => {
    bulkDeleteTools(selectedTools.map((tool) => tool.id));
  }, [bulkDeleteTools, selectedTools]);

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
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.agentBuilder.tools.toolsTableSummary"
              defaultMessage="Showing {start}-{end} of {total} {tools}"
              values={{
                start: <strong>{Math.min(pageIndex * 10 + 1, tools.length)}</strong>,
                end: <strong>{Math.min((pageIndex + 1) * 10, tools.length)}</strong>,
                total,
                tools: <strong>{labels.tools.toolsLabel}</strong>,
              }}
            />
          </EuiText>
          {selectedTools.length > 0 && (
            <EuiFlexGroup gutterSize="none">
              {manageTools && (
                <EuiButtonEmpty
                  aria-label={labels.tools.deleteSelectedToolsButtonLabel(selectedTools.length)}
                  data-test-subj="agentBuilderToolsBulkDeleteButton"
                  iconType="trash"
                  iconSize="m"
                  size="xs"
                  color="danger"
                  onClick={deleteSelection}
                >
                  <EuiText
                    size="xs"
                    css={css`
                      font-weight: ${euiTheme.font.weight.semiBold};
                    `}
                  >
                    {labels.tools.deleteSelectedToolsButtonLabel(selectedTools.length)}
                  </EuiText>
                </EuiButtonEmpty>
              )}
              <EuiButtonEmpty
                aria-label={labels.tools.selectAllToolsButtonLabel}
                data-test-subj="agentBuilderToolsSelectAllButton"
                iconType="pagesSelect"
                iconSize="m"
                size="xs"
                onClick={selectAll}
              >
                <EuiText
                  size="xs"
                  css={css`
                    font-weight: ${euiTheme.font.weight.semiBold};
                  `}
                >
                  {labels.tools.selectAllToolsButtonLabel}
                </EuiText>
              </EuiButtonEmpty>
              <EuiButtonEmpty
                aria-label={labels.tools.clearSelectionButtonLabel}
                data-test-subj="agentBuilderToolsClearSelectionButton"
                iconType="cross"
                iconSize="m"
                size="xs"
                onClick={clearSelection}
              >
                <EuiText
                  size="xs"
                  css={css`
                    font-weight: ${euiTheme.font.weight.semiBold};
                  `}
                >
                  {labels.tools.clearSelectionButtonLabel}
                </EuiText>
              </EuiButtonEmpty>
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
      }
    />
  );
};

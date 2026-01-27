/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useCallback } from 'react';
import useToggle from 'react-use/lib/useToggle';
import { labels } from '../../../utils/i18n';

const tableHeaderContainerStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin-block-start: -${euiTheme.size.s};
`;

const tableHeaderStyles = css`
  min-height: 24px;
`;

const tableHeaderSkeletonStyles = css`
  display: inline-block;
  width: 200px;
`;

const tableHeaderButtonStyles = ({ euiTheme }: UseEuiTheme) => css`
  font-weight: ${euiTheme.font.weight.semiBold};
`;

export interface McpToolsSelectionTableHeaderProps {
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export const McpToolsSelectionTableHeader = memo<McpToolsSelectionTableHeaderProps>(
  ({
    isLoading,
    pageIndex,
    pageSize,
    totalCount,
    selectedCount,
    onSelectAll,
    onClearSelection,
  }) => {
    const [isPopoverOpen, togglePopover] = useToggle(false);

    const closePopover = useCallback(() => {
      togglePopover(false);
    }, [togglePopover]);

    const handleSelectAll = useCallback(() => {
      onSelectAll();
      togglePopover(false);
    }, [onSelectAll, togglePopover]);

    const paginationStart = pageIndex * pageSize + 1;
    const paginationEnd = Math.min((pageIndex + 1) * pageSize, totalCount);

    return (
      <EuiSkeletonLoading
        isLoading={isLoading}
        css={tableHeaderContainerStyles}
        loadingContent={<EuiSkeletonText css={tableHeaderSkeletonStyles} lines={1} size="xs" />}
        loadedContent={
          totalCount > 0 ? (
            <EuiFlexGroup gutterSize="s" alignItems="center" css={tableHeaderStyles}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <FormattedMessage
                    id="xpack.agentBuilder.tools.bulkImportMcp.sourceSection.tableSummary"
                    defaultMessage="Showing {start}-{end} of {total}"
                    values={{
                      start: <strong>{paginationStart}</strong>,
                      end: <strong>{paginationEnd}</strong>,
                      total: totalCount,
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
              {selectedCount > 0 && (
                <EuiFlexGroup gutterSize="none" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiPopover
                      button={
                        <EuiButtonEmpty
                          iconType="arrowDown"
                          iconSide="right"
                          iconSize="s"
                          size="xs"
                          onClick={togglePopover}
                          data-test-subj="bulkImportMcpToolsSelectionPopoverButton"
                          css={tableHeaderButtonStyles}
                        >
                          {labels.tools.bulkImportMcp.sourceSection.selectedCount(selectedCount)}
                        </EuiButtonEmpty>
                      }
                      isOpen={isPopoverOpen}
                      closePopover={closePopover}
                      panelPaddingSize="none"
                      anchorPosition="downLeft"
                    >
                      <EuiContextMenuPanel
                        size="s"
                        items={[
                          <EuiContextMenuItem
                            key="selectAll"
                            icon="pagesSelect"
                            onClick={handleSelectAll}
                            data-test-subj="bulkImportMcpToolsSelectAllButton"
                          >
                            {labels.tools.selectAllToolsButtonLabel}
                          </EuiContextMenuItem>,
                        ]}
                      />
                    </EuiPopover>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="cross"
                      iconSize="s"
                      size="xs"
                      color="danger"
                      onClick={onClearSelection}
                      data-test-subj="bulkImportMcpToolsClearSelectionButton"
                      css={tableHeaderButtonStyles}
                    >
                      {labels.tools.bulkImportMcp.sourceSection.clearSelection}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiFlexGroup>
          ) : null
        }
      />
    );
  }
);

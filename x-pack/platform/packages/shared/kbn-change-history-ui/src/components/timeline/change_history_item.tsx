/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useContext, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import { ChangeHistoryModalSelectionContext } from '../../provider/change_history_modal_selection_context';
import { ChangeHistoryActionBadge } from './change_history_action_badge';
import { ChangeHistoryItemComment } from './change_history_item_comment';
import { ChangeHistoryListTimestamp } from './change_history_list_timestamp';
import { renderDefaultChangeHistoryRowActions } from './change_history_row_actions';
import * as i18n from './translations';

export interface ChangeHistoryItemProps {
  item: ChangeHistoryListItem;
  selected?: boolean;
  onClick: () => void;
}

export const ChangeHistoryItem = memo(function ChangeHistoryItem({
  item,
  selected,
  onClick,
}: ChangeHistoryItemProps): JSX.Element {
  const { renderBadge, renderChangesSummary, supports } = useChangeHistoryConfig();
  const modalSelection = useContext(ChangeHistoryModalSelectionContext);
  const { euiTheme } = useEuiTheme();
  const timestamp = useMemo(() => new Date(item.timestamp), [item.timestamp]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const badge = useMemo(
    () => (renderBadge ? renderBadge({ item }) : <ChangeHistoryActionBadge item={item} />),
    [item, renderBadge]
  );

  const rowActions = useMemo(() => {
    if (!modalSelection) {
      return null;
    }

    const hasCompare = supports.compare && Boolean(modalSelection.requestCompareToVersion);
    const hasRestore = Boolean(modalSelection.requestRestoreVersion);

    if (!hasCompare && !hasRestore) {
      return null;
    }

    return renderDefaultChangeHistoryRowActions({
      item,
      ...(hasCompare
        ? { requestCompareToVersion: () => modalSelection.requestCompareToVersion?.(item.id) }
        : {}),
      ...(hasRestore
        ? { requestRestoreVersion: () => modalSelection.requestRestoreVersion?.(item.id) }
        : {}),
    });
  }, [item, modalSelection, supports.compare]);

  const changesSummaryTooltip = useMemo(() => {
    if (!item.changes?.summary || !renderChangesSummary) {
      return null;
    }

    return renderChangesSummary({
      item,
      changes: item.changes,
      summary: item.changes.summary,
    });
  }, [item, renderChangesSummary]);

  const containerStyles = useMemo(
    () => css`
      margin: 0;
      padding: ${euiTheme.size.base};

      ${selected ? `background-color: ${euiTheme.colors.backgroundLightPrimary};` : ''}

      &:hover {
        background-color: ${selected
          ? euiTheme.colors.backgroundLightPrimary
          : euiTheme.colors.backgroundBaseInteractiveHover};
      }
    `,
    [euiTheme, selected]
  );

  const selectableStyles = useMemo(
    () => css`
      min-width: 0;
      flex: 1 1 auto;
      cursor: pointer;

      &:focus {
        outline: none;
      }

      &:focus-visible {
        outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
        outline-offset: ${euiTheme.focus.width};
      }
    `,
    [euiTheme]
  );

  return (
    <EuiPanel hasBorder hasShadow={false} grow={false} paddingSize="none" css={containerStyles}>
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap={false}>
            <EuiFlexItem
              grow={true}
              role="button"
              tabIndex={0}
              onClick={onClick}
              onKeyDown={handleKeyDown}
              data-test-subj={`changeHistoryItem-${item.id}`}
              data-selected={selected ? true : undefined}
              css={selectableStyles}
            >
              <EuiFlexGroup
                gutterSize="m"
                alignItems="center"
                justifyContent="spaceBetween"
                responsive={false}
              >
                <EuiFlexItem
                  css={css`
                    min-width: 0;
                    overflow: hidden;
                  `}
                >
                  <EuiFlexGroup
                    direction="column"
                    gutterSize="none"
                    responsive={false}
                    css={css`
                      gap: 2px;
                    `}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        position="top"
                        content={<ChangeHistoryListTimestamp value={timestamp} withSeconds />}
                      >
                        <EuiText
                          size="xs"
                          tabIndex={0}
                          css={css`
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            font-weight: ${euiTheme.font.weight.semiBold};
                            color: ${euiTheme.colors.textHeading};
                          `}
                        >
                          <ChangeHistoryListTimestamp value={timestamp} />
                        </EuiText>
                      </EuiToolTip>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiText
                        size="xs"
                        color="subdued"
                        css={css`
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                        `}
                      >
                        {item.actor.name}
                        {item.changes ? (
                          <>
                            {' • '}
                            {changesSummaryTooltip ? (
                              <EuiToolTip position="top" content={changesSummaryTooltip}>
                                <span tabIndex={0} data-test-subj="changeHistoryItemChanges">
                                  {i18n.N_CHANGES(item.changes.count)}
                                </span>
                              </EuiToolTip>
                            ) : (
                              <span data-test-subj="changeHistoryItemChanges">
                                {i18n.N_CHANGES(item.changes.count)}
                              </span>
                            )}
                          </>
                        ) : null}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem
                  grow={false}
                  css={css`
                    flex-shrink: 0;

                    .euiBadge {
                      font-weight: ${euiTheme.font.weight.medium};
                    }
                  `}
                >
                  {badge}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            {rowActions ? <EuiFlexItem grow={false}>{rowActions}</EuiFlexItem> : null}
          </EuiFlexGroup>
        </EuiFlexItem>

        {item.comment && (
          <EuiFlexItem
            grow={false}
            css={css`
              min-width: 0;
            `}
          >
            <div onClick={onClick} onKeyDown={handleKeyDown} role="presentation">
              <ChangeHistoryItemComment comment={item.comment} />
            </div>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
});

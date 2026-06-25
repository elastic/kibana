/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ChangeHistoryBadgeRenderFn } from '../../types/change_history_badge';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import { ChangeHistoryActionBadge } from './change_history_action_badge';
import { ChangeHistoryItemComment } from './change_history_item_comment';
import { ChangeHistoryListTimestamp } from './change_history_list_timestamp';
import * as i18n from './translations';

export interface ChangeHistoryItemProps {
  item: ChangeHistoryListItem;
  selected?: boolean;
  onClick: () => void;
  renderBadge?: ChangeHistoryBadgeRenderFn;
}

export const ChangeHistoryItem = memo(function ChangeHistoryItem({
  item,
  selected,
  onClick,
  renderBadge,
}: ChangeHistoryItemProps): JSX.Element {
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

  const panelStyles = useMemo(
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
      flex: 1 1 auto;
      min-width: 0;
      cursor: pointer;
      border-radius: ${euiTheme.border.radius.small};

      &:hover,
      &:focus {
        outline: none;
      }
    `,
    [euiTheme]
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      grow={false}
      paddingSize="none"
      data-test-subj={`changeHistoryItem-${item.id}`}
      data-selected={selected ? true : undefined}
      css={panelStyles}
    >
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            data-test-subj={`changeHistoryItemSelect-${item.id}`}
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
                      {item.changeCount != null && item.changeCount > 0
                        ? ` • ${i18n.N_CHANGES(item.changeCount)}`
                        : ''}
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
          </div>
        </EuiFlexItem>

        {item.comment && (
          <EuiFlexItem
            grow={false}
            css={css`
              min-width: 0;
            `}
          >
            <ChangeHistoryItemComment comment={item.comment} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import type { ChangeHistoryBadgeRenderFn } from '../../types/change_history_badge';
import { ChangeHistoryEmptyPrompt } from './change_history_empty_prompt';
import { ChangeHistoryFooter } from './change_history_footer';
import { ChangeHistoryItem } from './change_history_item';
import * as i18n from './translations';

export interface ChangeHistoryTimelineProps {
  items: ChangeHistoryListItem[];
  selectedItemId?: string;
  /** Optional footer date when the domain can supply a reliable tracking start. */
  historyStartedAt?: Date;
  isLoading?: boolean;
  onSelectItem?: (item: ChangeHistoryListItem) => void;
  /** When provided, an intersection observer requests more pages (Plan 2 step 2-3). */
  onLoadMore?: () => void;
  /** Domain-specific badge content for each row. Falls back to action label when omitted. */
  renderBadge?: ChangeHistoryBadgeRenderFn;
}

export function ChangeHistoryTimeline({
  items,
  selectedItemId,
  historyStartedAt,
  isLoading,
  onSelectItem,
  onLoadMore,
  renderBadge,
}: ChangeHistoryTimelineProps): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [onLoadMore]);

  const styles = useMemo(
    () => ({
      changesTimelineWrapper: css`
        display: flex;
        flex-direction: column;
        height: 100%;
      `,
      changesTimeline: css`
        flex: 1 1 0;
        overflow-y: auto;
        min-height: 0;
        padding-top: ${euiTheme.size.s};
        padding-left: ${euiTheme.size.m};
        padding-right: ${euiTheme.size.m};
      `,
    }),
    [euiTheme]
  );

  if (items.length === 0 && isLoading) {
    return <Loading />;
  }

  if (items.length === 0) {
    return <NoData />;
  }

  return (
    <div data-test-subj="changeHistoryTimeline" css={styles.changesTimelineWrapper}>
      <div
        css={styles.changesTimeline}
        aria-label={i18n.TIMELINE_ARIA_LABEL}
        data-test-subj="changeHistoryTimelineList"
      >
        {items.map((item) => (
          <ChangeHistoryItem
            key={item.id}
            item={item}
            selected={selectedItemId === item.id}
            onClick={() => onSelectItem?.(item)}
            renderBadge={renderBadge}
          />
        ))}
        {onLoadMore && <div ref={sentinelRef} />}
        {isLoading && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
        <EuiSpacer size="s" />
      </div>
      {historyStartedAt && <ChangeHistoryFooter startedAt={historyStartedAt} />}
    </div>
  );
}

function Loading(): JSX.Element {
  return (
    <EuiPanel hasBorder data-test-subj="changeHistoryTimelineLoading">
      <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18n.LOADING_LABEL}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function NoData(): JSX.Element {
  return (
    <div
      css={css`
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
        height: 100%;
      `}
      data-test-subj="changeHistoryTimelineEmpty"
    >
      <ChangeHistoryEmptyPrompt />
    </div>
  );
}

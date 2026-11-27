/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ICONS } from '../../icons';
import { isTimelineEventItem, useAllItems } from '../scope/use_all_items';
import { EmptyState, ErrorState, LoadingState, formatDuration } from '../shared';
import type { TabProps } from '../tabs/tab_props';
import {
  MAX_EVENTS,
  getStages,
  groupByDay,
  matchesEventSearch,
  mergeLanes,
  parseTime,
  sortSecurityEvents,
} from './activity_helpers';
import type { Lane, StageSummary } from './activity_helpers';
import { StageStrip } from './stage_strip';
import { TimelineList } from './timeline_list';
import { TimelineToolbar } from './timeline_toolbar';
import { useFreshIds, useResponseLog } from './use_response_log';
import type { SortOrder } from './use_response_log';
import * as i18n from './translations';

const SEARCH_DEBOUNCE_MS = 400;
const HIGHLIGHT_MS = 3500;

export const ActivityPanel: React.FC<TabProps> = ({ record, onNavigateTab }) => {
  const recordId = record.id;
  const [lane, setLane] = useState<Lane>('all');
  const [order, setOrder] = useState<SortOrder>('asc');
  const [searchText, setSearchText] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const baselineRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setServerSearch(searchText.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const eventsQuery = useAllItems(recordId, 'timeline_event', isTimelineEventItem, MAX_EVENTS);
  const logQuery = useResponseLog(recordId, serverSearch, order);

  const allEvents = useMemo(
    () => sortSecurityEvents(eventsQuery.data?.items ?? []),
    [eventsQuery.data]
  );
  const entries = useMemo(
    () => (logQuery.data?.pages ?? []).flatMap((page) => page.entries),
    [logQuery.data]
  );
  const firstPage = logQuery.data?.pages[0];
  const responseTotal = firstPage?.total ?? 0;

  if (baselineRef.current === null && firstPage && serverSearch.length === 0) {
    baselineRef.current = firstPage.latest_ts ?? '';
  }

  const clientQuery = searchText.trim().toLowerCase();
  const events = useMemo(
    () => allEvents.filter((item) => matchesEventSearch(item, clientQuery)),
    [allEvents, clientQuery]
  );
  const { rows, heldBack } = useMemo(
    () =>
      mergeLanes({
        lane,
        order,
        events,
        entries,
        hasMoreEntries: Boolean(logQuery.hasNextPage),
      }),
    [lane, order, events, entries, logQuery.hasNextPage]
  );
  const days = useMemo(() => groupByDay(rows), [rows]);
  const stages = useMemo(() => getStages(allEvents), [allEvents]);
  const originTs =
    allEvents.length > 0 ? parseTime(allEvents[0].timeline_event.occurred_at) : undefined;

  const freshCandidates = useMemo(() => {
    const baseline = baselineRef.current;
    return [
      ...allEvents.map((item) => `event-${item.id}`),
      ...(baseline === null
        ? []
        : entries
            .filter((entry) => parseTime(entry.ts) > parseTime(baseline))
            .map((entry) => `entry-${entry.id}`)),
    ];
  }, [allEvents, entries]);
  const freshIds = useFreshIds(
    Boolean(eventsQuery.data) && Boolean(logQuery.data),
    freshCandidates
  );

  useEffect(() => {
    if (!highlightedId) {
      return;
    }
    const scrollTimer = setTimeout(() => {
      document
        .getElementById(`investigation-timeline-${highlightedId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
    const clearTimer = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightedId]);

  const selectStage = (stage: StageSummary) => {
    setLane('all');
    setSearchText('');
    setServerSearch('');
    setHighlightedId(`event-${stage.firstEvent.id}`);
  };

  if (eventsQuery.isLoading || (logQuery.isLoading && !logQuery.data)) {
    return <LoadingState label={i18n.LOADING} />;
  }
  if (eventsQuery.error || logQuery.error) {
    return (
      <ErrorState
        title={i18n.LOAD_ERROR}
        error={eventsQuery.error ?? logQuery.error}
        onRetry={() => {
          void eventsQuery.refetch();
          void logQuery.refetch();
        }}
      />
    );
  }

  const hasNothing = allEvents.length === 0 && responseTotal === 0 && serverSearch.length === 0;
  if (hasNothing) {
    return (
      <EmptyState
        iconType={ICONS.activity}
        title={i18n.NO_ENTRIES_TITLE}
        body={i18n.NO_ENTRIES_BODY}
        data-test-subj="investigationActivityEmpty"
      />
    );
  }

  const lastEventTs =
    allEvents.length > 0
      ? parseTime(allEvents[allEvents.length - 1].timeline_event.occurred_at)
      : 0;
  const remaining = Math.max(0, responseTotal - entries.length);
  return (
    <div data-test-subj="investigationActivityTab">
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        {record.summary ? (
          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="m" hasShadow={false} hasBorder color="subdued">
              <EuiTitle size="xxs">
                <h3>{i18n.SUMMARY_TITLE}</h3>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText size="s" data-test-subj="investigationActivitySummary">
                <p>{record.summary}</p>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        ) : null}
        {lane !== 'response' && stages.length > 0 ? (
          <EuiFlexItem grow={false}>
            <StageStrip stages={stages} onSelectStage={selectStage} />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
            <EuiFlexGroup gutterSize="s" alignItems="baseline" wrap responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>{i18n.TIMELINE_TITLE}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="investigationTimelineCount">
                  {rows.length}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow>
                <EuiText size="xs" color="subdued" textAlign="right">
                  {allEvents.length > 0
                    ? i18n.TIMELINE_SUBTITLE(
                        allEvents.length,
                        formatDuration(lastEventTs - (originTs ?? lastEventTs)),
                        responseTotal
                      )
                    : i18n.TIMELINE_SUBTITLE_NO_EVENTS(responseTotal)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <TimelineToolbar
              lane={lane}
              onLaneChange={setLane}
              allCount={allEvents.length + responseTotal}
              securityCount={allEvents.length}
              responseCount={responseTotal}
              searchText={searchText}
              onSearchChange={setSearchText}
              order={order}
              onOrderChange={setOrder}
              onJump={() => endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })}
            />
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              <p>{i18n.LEGEND}</p>
            </EuiText>
            <EuiSpacer size="m" />
            {rows.length === 0 ? (
              <EuiText size="s" color="subdued" data-test-subj="investigationTimelineNoMatch">
                <p>{i18n.NO_MATCH}</p>
              </EuiText>
            ) : (
              <TimelineList
                days={days}
                offsetOrigin={originTs}
                highlightedId={highlightedId}
                freshIds={freshIds}
                onNavigateTab={onNavigateTab}
              />
            )}
            {heldBack > 0 ? (
              <EuiText size="xs" color="subdued" data-test-subj="investigationTimelineHeldBack">
                <p>{i18n.HELD_BACK(heldBack)}</p>
              </EuiText>
            ) : null}
            {logQuery.hasNextPage && lane !== 'security' ? (
              <>
                <EuiSpacer size="s" />
                <EuiButton
                  size="s"
                  isLoading={logQuery.isFetchingNextPage}
                  onClick={() => void logQuery.fetchNextPage()}
                  data-test-subj="investigationTimelineLoadMore"
                >
                  {i18n.LOAD_MORE(remaining)}
                </EuiButton>
              </>
            ) : null}
            <div ref={endRef} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
ActivityPanel.displayName = 'ActivityPanel';

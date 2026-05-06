/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { OnTimeChangeProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import datemath from '@kbn/datemath';
import { parseDurationToMs } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  ALERT_TIMELINE_TOP_N_DEFAULT,
  deriveAlertTimelineData,
} from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { AlertTimelineLegend } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { useRule } from '../../rule_context';
import { useFetchRuleEvents } from '../../../../hooks/use_fetch_rule_events';
import { getDiscoverHrefForRuleQuery } from '../../../../utils/discover_href_for_episode';
import { paths } from '../../../../constants';
import { AlertTimelineChart } from './alert_timeline_chart';
import { AlertTimelineFooter } from './alert_timeline_footer';
import { AlertTimelineStatsRow } from './alert_timeline_stats_row';
import { useAlertTimelineUrlState } from './use_alert_timeline_url_state';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const DEFAULT_ALERT_TIMELINE_TIME_RANGE = { from: 'now-7d', to: 'now' };

const COMMONLY_USED_RANGES = [
  { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
  { start: 'now-6h', end: 'now', label: 'Last 6 hours' },
  { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
  { start: 'now-7d', end: 'now', label: 'Last 7 days' },
  { start: 'now-30d', end: 'now', label: 'Last 30 days' },
];

const resolveGteLte = (from: string, to: string): { gteMs: number; lteMs: number } => {
  const fromMs = datemath.parse(from)?.valueOf();
  const toMs = datemath.parse(to, { roundUp: true })?.valueOf();
  const now = Date.now();
  return {
    gteMs: Number.isFinite(fromMs) ? (fromMs as number) : now - 7 * DAY_MS,
    lteMs: Number.isFinite(toMs) ? (toMs as number) : now,
  };
};

export const AlertTimelineSection: React.FC = () => {
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const share = useService(PluginStart('share')) as SharePluginStart;
  const application = useService(CoreStart('application'));
  const uiSettings = useService(CoreStart('uiSettings'));
  const http = useService(CoreStart('http'));
  const rule = useRule();
  const groupingFields = useMemo(() => rule.grouping?.fields ?? [], [rule.grouping?.fields]);

  const [timeRange, setTimeRange] = useAlertTimelineUrlState(DEFAULT_ALERT_TIMELINE_TIME_RANGE);
  const [refreshTick, setRefreshTick] = useState(0);

  const handleTimeChange = useCallback(
    (next: OnTimeChangeProps) => {
      setTimeRange({ from: next.start, to: next.end });
    },
    [setTimeRange]
  );

  const handleRefresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  const { gteMs, lteMs } = useMemo(
    () => resolveGteLte(timeRange.from, timeRange.to),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeRange.from, timeRange.to, refreshTick]
  );

  // Lookback buffer: fetch a small window of events BEFORE the visible range
  // so deriveAlertTimelineData can tell whether the first in-window event for
  // an episode is a real transition or a continuation of a status that was
  // already in effect.
  const bufferMs = useMemo(() => {
    const scheduleMs = parseDurationToMs(rule.schedule.every);
    const fallback = 60_000;
    const ms = Number.isFinite(scheduleMs) ? scheduleMs : fallback;
    return Math.min(Math.max(2 * ms, fallback), 60 * 60_000);
  }, [rule.schedule.every]);
  const fetchGteMs = gteMs - bufferMs;

  const { events, groupingValuesByHash, summary, totalSeriesCount, isLoading, isError } =
    useFetchRuleEvents({
      ruleId: rule.id,
      gteMs,
      lteMs,
      eventGteMs: fetchGteMs,
      groupingFields,
      topN: ALERT_TIMELINE_TOP_N_DEFAULT,
      data,
    });

  const timelineData = useMemo(
    () =>
      deriveAlertTimelineData(
        events,
        groupingValuesByHash,
        'recently_active',
        gteMs,
        lteMs,
        summary,
        totalSeriesCount
      ),
    [events, groupingValuesByHash, gteMs, lteMs, summary, totalSeriesCount]
  );

  const discoverHref = useMemo(
    () =>
      getDiscoverHrefForRuleQuery({
        share,
        capabilities: application.capabilities,
        uiSettings,
        timeRange: {
          from: new Date(gteMs).toISOString(),
          to: new Date(lteMs).toISOString(),
        },
        ruleEsql: rule.evaluation?.query?.base,
      }),
    [share, application.capabilities, uiSettings, gteMs, lteMs, rule.evaluation?.query?.base]
  );

  const viewAllHref = useMemo(
    () =>
      http.basePath.prepend(
        paths.alertEpisodesList({
          filters: { ruleId: rule.id },
          timeRange: {
            from: new Date(gteMs).toISOString(),
            to: new Date(lteMs).toISOString(),
          },
        })
      ),
    [http, rule.id, gteMs, lteMs]
  );

  const getEpisodeHref = useCallback(
    (episodeId: string) => http.basePath.prepend(paths.alertEpisodeDetails(episodeId)),
    [http]
  );

  const onEpisodeClick = useCallback(
    (episodeId: string) => {
      application.navigateToUrl(getEpisodeHref(episodeId));
    },
    [application, getEpisodeHref]
  );

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="ruleAlertTimelineSection">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.alertingV2.alertTimeline.title', {
                defaultMessage: 'Alert activity',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSuperDatePicker
                compressed
                start={timeRange.from}
                end={timeRange.to}
                onTimeChange={handleTimeChange}
                onRefresh={handleRefresh}
                isLoading={isLoading}
                showUpdateButton="iconOnly"
                commonlyUsedRanges={COMMONLY_USED_RANGES}
                width="auto"
                data-test-subj="alertTimelineDatePicker"
              />
            </EuiFlexItem>
            {discoverHref && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="discoverApp"
                  href={discoverHref}
                  target="_blank"
                  data-test-subj="alertTimelineExploreInDiscover"
                >
                  {i18n.translate('xpack.alertingV2.alertTimeline.exploreInDiscover', {
                    defaultMessage: 'Explore in Discover',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <AlertTimelineStatsRow summary={timelineData.summary} />
      <EuiSpacer size="m" />
      <AlertTimelineLegend />
      <EuiSpacer size="m" />

      {isLoading && (
        <div
          css={css`
            display: flex;
            justify-content: center;
            padding: 24px;
          `}
          data-test-subj="alertTimelineSectionLoading"
        >
          <EuiLoadingChart size="l" />
        </div>
      )}

      {!isLoading && isError && (
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          data-test-subj="alertTimelineSectionError"
          title={
            <h4>
              {i18n.translate('xpack.alertingV2.alertTimeline.errorTitle', {
                defaultMessage: 'Could not load episodes',
              })}
            </h4>
          }
          body={
            <EuiText size="s">
              {i18n.translate('xpack.alertingV2.alertTimeline.errorBody', {
                defaultMessage:
                  'Try a smaller time range or refresh the page. Check the rule events index is reachable.',
              })}
            </EuiText>
          }
        />
      )}

      {!isLoading && !isError && timelineData.rows.length === 0 && (
        <EuiEmptyPrompt
          iconType="bell"
          data-test-subj="alertTimelineSectionEmpty"
          title={
            <h4>
              {i18n.translate('xpack.alertingV2.alertTimeline.emptyTitle', {
                defaultMessage: 'No episodes in this window',
              })}
            </h4>
          }
          body={
            <EuiText size="s">
              {i18n.translate('xpack.alertingV2.alertTimeline.emptyBody', {
                defaultMessage: 'Episodes appear here once the rule fires.',
              })}
            </EuiText>
          }
        />
      )}

      {!isLoading && !isError && timelineData.rows.length > 0 && (
        <>
          <AlertTimelineChart
            rows={timelineData.rows}
            gteMs={gteMs}
            lteMs={lteMs}
            ruleId={rule.id}
            basePath={http.basePath}
            onEpisodeClick={onEpisodeClick}
            getEpisodeHref={getEpisodeHref}
          />
          <EuiSpacer size="m" />
          <AlertTimelineFooter viewAllHref={viewAllHref} />
        </>
      )}
    </EuiPanel>
  );
};

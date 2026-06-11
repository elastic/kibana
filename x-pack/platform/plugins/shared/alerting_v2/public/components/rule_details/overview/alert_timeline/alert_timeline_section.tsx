/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { AlertTimelineStatsRow } from './alert_timeline_stats_row';
import { AlertTimelineViewAllButton } from './alert_timeline_view_all_button';
import { useAlertTimelineUrlState } from './use_alert_timeline_url_state';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const DEFAULT_ALERT_TIMELINE_TIME_RANGE = { from: 'now-7d', to: 'now' };

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
  const groupingFields = rule.grouping?.fields;
  const hasGroupingFields = (groupingFields?.length ?? 0) > 0;
  const timeZone = uiSettings.get<string>('dateFormat:tz', 'Browser');

  const [timeRange, setTimeRange] = useAlertTimelineUrlState(DEFAULT_ALERT_TIMELINE_TIME_RANGE);
  const [refreshTick, setRefreshTick] = useState(0);

  const handleTimeChange = useCallback(
    (next: OnTimeChangeProps) => {
      setTimeRange({ from: next.start, to: next.end });
    },
    [setTimeRange]
  );

  const handleRefresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  const { gteMs, lteMs } = useMemo(() => {
    void refreshTick;
    return resolveGteLte(timeRange.from, timeRange.to);
  }, [timeRange.from, timeRange.to, refreshTick]);

  // Small lookback buffer so each episode's status at the left edge is known.
  // The events query keeps the most-recent events per episode, and the start
  // anchors restore each episode's true left edge, so the fetch window tracks
  // the visible window (per-episode capping bounds the payload, not the window).
  const bufferMs = useMemo(() => {
    const raw = parseDurationToMs(rule.schedule.every);
    const ms = Number.isFinite(raw) ? (raw as number) : 60_000;
    return Math.min(Math.max(2 * ms, 60_000), 60 * 60_000);
  }, [rule.schedule.every]);

  const fetchGteMs = gteMs - bufferMs;

  const {
    events,
    groupingValuesByHash,
    summary,
    anchorByEpisode,
    totalSeriesCount,
    isLoading,
    isError,
  } = useFetchRuleEvents({
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
        totalSeriesCount,
        anchorByEpisode
      ),
    [events, groupingValuesByHash, gteMs, lteMs, summary, totalSeriesCount, anchorByEpisode]
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
        ruleEsql: rule.evaluation.query.base,
      }),
    [share, application.capabilities, uiSettings, gteMs, lteMs, rule.evaluation.query.base]
  );

  const viewAllHref = useMemo(
    () =>
      http.basePath.prepend(
        paths.alertEpisodesListHref({
          filters: { ruleId: rule.id, status: 'all' },
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
    <div data-test-subj="ruleAlertTimelineSection">
      {/* Section header — no panel */}
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
          <EuiSuperDatePicker
            compressed
            width="auto"
            start={timeRange.from}
            end={timeRange.to}
            onTimeChange={handleTimeChange}
            onRefresh={handleRefresh}
            isLoading={isLoading}
            showUpdateButton="iconOnly"
            updateButtonProps={{ fill: false }}
            data-test-subj="alertTimelineDatePicker"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* KPI panel */}
      <EuiPanel hasBorder paddingSize="m" data-test-subj="alertTimelineKpiPanel">
        <AlertTimelineStatsRow summary={timelineData.summary} />
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* Chart panel */}
      <EuiPanel hasBorder paddingSize="m" data-test-subj="alertTimelineChartPanel">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('xpack.alertingV2.alertTimeline.seriesTitle', {
                  defaultMessage: 'Alert series',
                })}
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AlertTimelineViewAllButton viewAllHref={viewAllHref} discoverHref={discoverHref} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <AlertTimelineLegend />
        <EuiSpacer size="m" />

        {isLoading && (
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            responsive={false}
            data-test-subj="alertTimelineSectionLoading"
          >
            <EuiFlexItem grow={false}>
              <EuiSpacer size="l" />
              <EuiLoadingChart size="l" />
              <EuiSpacer size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
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
          <AlertTimelineChart
            rows={timelineData.rows}
            gteMs={gteMs}
            lteMs={lteMs}
            timeZone={timeZone}
            showLabelColumn={hasGroupingFields}
            onEpisodeClick={onEpisodeClick}
            getEpisodeHref={getEpisodeHref}
          />
        )}
      </EuiPanel>
    </div>
  );
};

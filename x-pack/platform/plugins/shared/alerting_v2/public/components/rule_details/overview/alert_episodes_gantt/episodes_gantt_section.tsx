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
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { useRule } from '../../rule_context';
import { useFetchRuleEpisodes } from '../../../../hooks/use_fetch_rule_episodes';
import {
  deriveGanttData,
  GANTT_TOP_N_DEFAULT,
  type GanttEpisode,
  type GanttSortPolicy,
} from '../../../../utils/derive_gantt_data';
import { getDiscoverHrefForRuleQuery } from '../../../../utils/discover_href_for_episode';
import { paths } from '../../../../constants';
import { GanttChart } from './gantt_chart';
import { GanttFooter } from './gantt_footer';
import { GanttLegend } from './gantt_legend';
import { GanttStatsRow } from './gantt_stats_row';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const VISIBLE_WINDOW_MS = 7 * DAY_MS;

export const EpisodesGanttSection: React.FC = () => {
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const expressions = useService(PluginStart('expressions')) as ExpressionsStart;
  const share = useService(PluginStart('share')) as SharePluginStart;
  const application = useService(CoreStart('application'));
  const uiSettings = useService(CoreStart('uiSettings'));
  const http = useService(CoreStart('http'));
  const rule = useRule();
  const groupingFields = useMemo(() => rule.grouping?.fields ?? [], [rule.grouping?.fields]);

  const [sort, setSort] = useState<GanttSortPolicy>('started_asc');

  const { gteMs, lteMs } = useMemo(() => {
    const now = Date.now();
    return { gteMs: now - VISIBLE_WINDOW_MS, lteMs: now };
  }, []);

  const { episodes, groupingValuesByHash, isLoading, isError } = useFetchRuleEpisodes({
    ruleId: rule.id,
    gteMs,
    lteMs,
    groupingFields,
    data,
    expressions,
  });

  const ganttData = useMemo(
    () => deriveGanttData(episodes, groupingValuesByHash, sort, GANTT_TOP_N_DEFAULT),
    [episodes, groupingValuesByHash, sort]
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

  // TODO: pass `ruleId` via URL params once the episodes list page syncs filter
  // state to the URL (`paths.alertEpisodesList` helper). For now this links to
  // the bare list and the user re-applies the rule filter manually.
  const viewAllHref = useMemo(() => http.basePath.prepend(paths.alertEpisodesList), [http]);

  const onEpisodeClick = useCallback(
    (episode: GanttEpisode) => {
      const href = http.basePath.prepend(paths.alertEpisodeDetails(episode.episodeId));
      application.navigateToUrl(href);
    },
    [http, application]
  );

  const ruleName = rule.metadata?.name ?? rule.id;
  const subtitle = i18n.translate('xpack.alertingV2.ruleDetails.gantt.subtitle', {
    defaultMessage: 'Rule: {ruleName} · {count, plural, one {# episode} other {# episodes}}',
    values: { ruleName, count: ganttData.summary.episodesStarted },
  });

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="ruleEpisodesGanttSection">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>
                      {i18n.translate('xpack.alertingV2.ruleDetails.gantt.title', {
                        defaultMessage: 'Alert episodes',
                      })}
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.alertingV2.ruleDetails.gantt.windowCaption', {
                      defaultMessage: '— last 7 days',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="ganttSubtitle">
                {subtitle}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {discoverHref && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="discoverApp"
              href={discoverHref}
              target="_blank"
              data-test-subj="ruleEpisodesGanttExploreInDiscover"
            >
              {i18n.translate('xpack.alertingV2.ruleDetails.gantt.exploreInDiscover', {
                defaultMessage: 'Explore in Discover',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <GanttStatsRow summary={ganttData.summary} />
      <EuiSpacer size="m" />
      <GanttLegend />
      <EuiSpacer size="m" />

      {isLoading && (
        <div
          css={css`
            display: flex;
            justify-content: center;
            padding: 24px;
          `}
          data-test-subj="ruleEpisodesGanttSectionLoading"
        >
          <EuiLoadingChart size="l" />
        </div>
      )}

      {!isLoading && isError && (
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          data-test-subj="ruleEpisodesGanttSectionError"
          title={
            <h4>
              {i18n.translate('xpack.alertingV2.ruleDetails.gantt.errorTitle', {
                defaultMessage: 'Could not load episodes',
              })}
            </h4>
          }
          body={
            <EuiText size="s">
              {i18n.translate('xpack.alertingV2.ruleDetails.gantt.errorBody', {
                defaultMessage:
                  'Try a smaller time range or refresh the page. Check the rule events index is reachable.',
              })}
            </EuiText>
          }
        />
      )}

      {!isLoading && !isError && ganttData.rows.length === 0 && (
        <EuiEmptyPrompt
          iconType="bell"
          data-test-subj="ruleEpisodesGanttSectionEmpty"
          title={
            <h4>
              {i18n.translate('xpack.alertingV2.ruleDetails.gantt.emptyTitle', {
                defaultMessage: 'No episodes in this window',
              })}
            </h4>
          }
          body={
            <EuiText size="s">
              {i18n.translate('xpack.alertingV2.ruleDetails.gantt.emptyBody', {
                defaultMessage: 'Episodes appear here once the rule fires.',
              })}
            </EuiText>
          }
        />
      )}

      {!isLoading && !isError && ganttData.rows.length > 0 && (
        <>
          <GanttChart
            rows={ganttData.rows}
            gteMs={gteMs}
            lteMs={lteMs}
            onEpisodeClick={onEpisodeClick}
          />
          <EuiSpacer size="m" />
          <GanttFooter
            sort={sort}
            onSortChange={setSort}
            visibleRowCount={ganttData.rows.length}
            totalRowCount={ganttData.totalRowCount}
            viewAllHref={viewAllHref}
          />
        </>
      )}
    </EuiPanel>
  );
};

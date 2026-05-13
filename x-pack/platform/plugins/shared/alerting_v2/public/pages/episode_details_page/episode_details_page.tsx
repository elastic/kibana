/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiTitle,
  logicalCSS,
  useEuiMinBreakpoint,
  useEuiMaxBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetchEpisodeEventDataQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_event_data_query';
import { useFetchEpisodeEventsQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_events_query';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import { useFetchRule } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_rule';
import {
  getEpisodeDurationMs,
  getGroupHashFromEpisodeRows,
  getLastEpisodeStatus,
  getRuleIdFromEpisodeRows,
  getTriggeredTimestamp,
} from '@kbn/alerting-v2-episodes-ui/utils/episode_series_derived';
import { createEpisodeActions, type EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import { EpisodeActionsBar } from '@kbn/alerting-v2-episodes-ui/components/episode_actions_bar';
import { AlertEpisodeDetailsHeaderSection } from '@kbn/alerting-v2-episodes-ui/components/details/details_header_section';
import { AlertEpisodeMetadataDetailsListSection } from '@kbn/alerting-v2-episodes-ui/components/details/metadata_details_list_section';
import { AlertEpisodeActionsOverviewSection } from '@kbn/alerting-v2-episodes-ui/components/details/actions_overview_section';
import { AlertEpisodeRuleOverviewPanelSection } from '@kbn/alerting-v2-episodes-ui/components/details/rule_overview_panel_section';
import { AlertEpisodeLifecycleHeatmapSection } from '@kbn/alerting-v2-episodes-ui/components/details/lifecycle_heatmap_section';
import { AlertEpisodesRelatedSection } from '@kbn/alerting-v2-episodes-ui/components/details/related_section';
import { AlertEpisodeMetadataSection } from '@kbn/alerting-v2-episodes-ui/components/details/metadata_section';
import { AlertEpisodeRunbookSection } from '@kbn/alerting-v2-episodes-ui/components/details/runbook_section';
import { css } from '@emotion/react';
import { useHistory, useParams } from 'react-router-dom';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { paths } from '../../constants';
import type { AlertEpisodesKibanaServices } from '../../episodes_kibana_services';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { getDiscoverHrefForRuleAndEpisodeTimestamp } from '../../utils/discover_href_for_episode';
import * as i18n from './translations';

interface EpisodeRouteParams {
  episodeId: string;
}

type EpisodeDetailsSidebarPanel = 'episode_details' | 'runbook';

type EpisodeDetailsMainPanel = 'overview' | 'metadata';

export function EpisodeDetailsPage() {
  const { euiTheme } = useEuiTheme();
  const { episodeId } = useParams<EpisodeRouteParams>();
  const [sidebarPanel, setSidebarPanel] = useState<EpisodeDetailsSidebarPanel>('episode_details');
  const [mainPanel, setMainPanel] = useState<EpisodeDetailsMainPanel>('overview');

  const { services } = useKibana<AlertEpisodesKibanaServices>();
  const queryClient = useQueryClient();
  const { data, http, expressions } = services;
  const history = useHistory();

  const smallMediaQuery = useEuiMaxBreakpoint('s');
  const largeMediaQuery = useEuiMinBreakpoint('m');

  const {
    data: eventRows = [],
    isLoading: isLoadingEvents,
    isError: isEventsError,
    refetch: refetchEpisodeEvents,
  } = useFetchEpisodeEventsQuery({
    episodeId,
    data,
  });

  const ruleId = useMemo(() => getRuleIdFromEpisodeRows(eventRows), [eventRows]);
  const groupHash = useMemo(() => getGroupHashFromEpisodeRows(eventRows), [eventRows]);

  const { data: rule, isLoading: isLoadingRule } = useFetchRule({ id: ruleId, http });

  const { data: episodeActionsMap, refetch: refetchEpisodeActions } = useFetchEpisodeActions({
    episodeIds: episodeId ? [episodeId] : [],
    expressions,
  });

  const { data: groupActionsMap, refetch: refetchGroupActions } = useFetchGroupActions({
    groupHashes: groupHash ? [groupHash] : [],
    expressions,
  });

  // The metadata section fetches its own copy of the episode event data via
  // React Query; this duplicate page-level call shares the same query key so
  // we can invalidate it via `refetchEpisodeEventData` when an action succeeds.
  const { refetch: refetchEpisodeEventData } = useFetchEpisodeEventDataQuery({
    episodeId,
    data,
  });

  const episodeBreadcrumbTitle =
    rule?.metadata.name != null && rule.metadata.name.length > 0
      ? rule.metadata.name
      : i18n.EPISODE_DETAILS_BREADCRUMB_FALLBACK;

  useBreadcrumbs('episode_details', { ruleName: episodeBreadcrumbTitle });

  const episodeAction = episodeId ? episodeActionsMap?.get(episodeId) : undefined;
  const groupAction = groupHash ? groupActionsMap?.get(groupHash) : undefined;

  const lastStatus = useMemo(() => getLastEpisodeStatus(eventRows), [eventRows]);
  const triggeredAt = useMemo(() => getTriggeredTimestamp(eventRows), [eventRows]);
  const durationMs = useMemo(() => getEpisodeDurationMs(eventRows), [eventRows]);

  const episodeIsoTimestamp = triggeredAt ?? eventRows[0]?.['@timestamp'];

  const detailsServices = useMemo(
    () => ({
      data: services.data,
      http: services.http,
      expressions: services.expressions,
      userProfile: services.userProfile,
    }),
    [services.data, services.http, services.expressions, services.userProfile]
  );

  const metadataServices = useMemo(
    () => ({
      ...detailsServices,
      uiSettings: services.uiSettings,
      unifiedDocViewer: services.unifiedDocViewer,
      dataViews: services.dataViews,
    }),
    [detailsServices, services.uiSettings, services.unifiedDocViewer, services.dataViews]
  );

  const getRuleDetailsHref = useCallback(
    (id: string) => http.basePath.prepend(paths.ruleDetails(id)),
    [http.basePath]
  );

  const getEpisodeDetailsHref = useCallback(
    (id: string) => http.basePath.prepend(paths.alertEpisodeDetails(id)),
    [http.basePath]
  );

  const episodeActions: EpisodeAction[] = useMemo(
    () =>
      createEpisodeActions({
        http: services.http,
        overlays: services.overlays,
        notifications: services.notifications,
        rendering: services.rendering,
        application: services.application,
        userProfile: services.userProfile,
        docLinks: services.docLinks,
        expressions: services.expressions,
        queryClient,
        getDiscoverHref: ({ episodeIsoTimestamp: ts }) =>
          getDiscoverHrefForRuleAndEpisodeTimestamp({
            share: services.share,
            capabilities: services.application.capabilities,
            uiSettings: services.uiSettings,
            ruleEsql: rule?.evaluation?.query?.base,
            episodeIsoTimestamp: ts,
          }),
      }),
    [services, queryClient, rule]
  );

  const episode = useMemo(() => {
    if (!episodeId || !lastStatus || !ruleId || !groupHash) {
      return undefined;
    }
    return {
      '@timestamp': episodeIsoTimestamp ?? eventRows[0]?.['@timestamp'] ?? '',
      'episode.id': episodeId,
      'episode.status': lastStatus,
      'rule.id': ruleId,
      group_hash: groupHash,
      first_timestamp: eventRows[0]?.['@timestamp'] ?? '',
      last_timestamp: eventRows[eventRows.length - 1]?.['@timestamp'] ?? '',
      duration: durationMs ?? 0,
      last_ack_action: (episodeAction?.lastAckAction as 'ack' | 'unack' | undefined) ?? undefined,
      last_assignee_uid: episodeAction?.lastAssigneeUid ?? undefined,
      last_snooze_action:
        (groupAction?.lastSnoozeAction as 'snooze' | 'unsnooze' | undefined) ?? undefined,
      last_deactivate_action:
        (groupAction?.lastDeactivateAction as 'activate' | 'deactivate' | undefined) ?? undefined,
      last_tags: groupAction?.tags,
    };
  }, [
    episodeId,
    lastStatus,
    ruleId,
    groupHash,
    episodeIsoTimestamp,
    eventRows,
    durationMs,
    episodeAction,
    groupAction,
  ]);

  const applicableActions = useMemo(
    () =>
      episode
        ? episodeActions.filter((action) => action.isCompatible({ episodes: [episode] }))
        : [],
    [episodeActions, episode]
  );

  const handleActionSuccess = useCallback(() => {
    refetchEpisodeEvents();
    refetchEpisodeActions();
    refetchGroupActions();
    refetchEpisodeEventData();
  }, [refetchEpisodeEvents, refetchEpisodeActions, refetchGroupActions, refetchEpisodeEventData]);

  const isLoading = isLoadingEvents || (Boolean(ruleId) && isLoadingRule);
  const episodeNotFound = !isLoading && eventRows.length === 0;

  if (!episodeId || episodeNotFound || isEventsError) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="danger"
        title={<h2>{i18n.EPISODE_NOT_FOUND_TITLE}</h2>}
        body={<p>{i18n.EPISODE_NOT_FOUND_BODY}</p>}
        actions={[
          <EuiButton
            color="primary"
            fill
            onClick={() => history.push('/')}
            data-test-subj="episodeDetailsErrorBackButton"
          >
            {i18n.BACK_TO_ALERT_EPISODES}
          </EuiButton>,
        ]}
        data-test-subj="episodeDetailsErrorPrompt"
      />
    );
  }

  const sidebarHeaderTitle =
    sidebarPanel === 'episode_details'
      ? i18n.SIDEBAR_TITLE_EPISODE_DETAILS
      : i18n.SIDEBAR_TITLE_RUNBOOK;

  const sidebar = (
    <>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
        css={css`
          flex-grow: 0;
          ${largeMediaQuery} {
            padding: ${euiTheme.size.l};
          }
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2 data-test-subj="alertingV2EpisodeDetailsSidebarTitle">{sidebarHeaderTitle}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.SIDEBAR_VIEW_LEGEND}
            type="single"
            buttonSize="compressed"
            idSelected={sidebarPanel}
            onChange={(id) => setSidebarPanel(id as EpisodeDetailsSidebarPanel)}
            options={[
              {
                id: 'episode_details',
                'data-test-subj': 'alertingV2EpisodeDetailsSidebarTabEpisodeDetails',
                label: i18n.SIDEBAR_TAB_TITLE_DETAILS,
              },
              {
                id: 'runbook',
                'data-test-subj': 'alertingV2EpisodeDetailsSidebarTabRunbook',
                label: i18n.SIDEBAR_TITLE_RUNBOOK,
              },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule
        css={css`
          ${largeMediaQuery} {
            margin-block: 0;
            margin-inline: ${euiTheme.size.l};
          }
          inline-size: unset;
        `}
      />
      <div
        css={css`
          min-height: 0;

          ${largeMediaQuery} {
            flex: 1;
            overflow-y: auto;
            padding: ${euiTheme.size.l};
          }
        `}
        data-test-subj="alertingV2EpisodeDetailsSidebarBody"
      >
        {sidebarPanel === 'episode_details' ? (
          <>
            <AlertEpisodeMetadataDetailsListSection
              episodeId={episodeId}
              services={detailsServices}
            />
            <EuiSpacer size="l" />
            <AlertEpisodeActionsOverviewSection episodeId={episodeId} services={detailsServices} />
            <EuiSpacer size="l" />
            <AlertEpisodeRuleOverviewPanelSection
              episodeId={episodeId}
              services={detailsServices}
              collapsible={false}
              getRuleDetailsHref={getRuleDetailsHref}
            />
          </>
        ) : (
          <AlertEpisodeRunbookSection episodeId={episodeId} services={detailsServices} />
        )}
      </div>
    </>
  );

  const sidebarPanelInner = (
    <EuiSplitPanel.Inner
      grow={false}
      paddingSize="none"
      css={css`
        display: flex;
        flex-direction: column;
        min-height: 0;
        ${logicalCSS('padding-top', euiTheme.size.l)}

        ${largeMediaQuery} {
          ${logicalCSS('padding-top', '0')}
          flex-shrink: 0;
          flex-basis: 400px;
          min-width: 40px;
          max-width: 500px;
          border-left: ${euiTheme.border.thin};
        }
      `}
      data-test-subj="alertingV2EpisodeDetailsSidebar"
    >
      {sidebar}
    </EuiSplitPanel.Inner>
  );

  return (
    <KibanaPageTemplate
      paddingSize="none"
      bottomBorder={false}
      data-test-subj="alertingV2EpisodeDetailsPage"
      minHeight={0}
      grow={false}
      css={css`
        ${largeMediaQuery} {
          block-size: calc(var(--kbn-application--content-height, 100vh) - ${euiTheme.size.l} * 2);
        }
      `}
      pageHeader={{
        pageTitle: (
          <AlertEpisodeDetailsHeaderSection episodeId={episodeId} services={detailsServices} />
        ),
        bottomBorder: true,
        restrictWidth: false,
        paddingSize: 'none',
        rightSideItems: [
          <EpisodeActionsBar
            key="alertingV2EpisodeHeaderActions"
            actions={applicableActions}
            episodes={episode ? [episode] : []}
            onSuccess={handleActionSuccess}
          />,
        ],
        rightSideGroupProps: { gutterSize: 's' },
        tabs: [
          {
            id: 'overview',
            'data-test-subj': 'alertingV2EpisodeDetailsMainTabOverview',
            label: i18n.OVERVIEW_TAB_TITLE,
            isSelected: mainPanel === 'overview',
            onClick: () => setMainPanel('overview'),
          },
          {
            id: 'metadata',
            'data-test-subj': 'alertingV2EpisodeDetailsMainTabMetadata',
            label: i18n.METADATA_TAB_TITLE,
            isSelected: mainPanel === 'metadata',
            onClick: () => setMainPanel('metadata'),
          },
        ],
      }}
    >
      {isLoading ? (
        <KibanaPageTemplate.Section grow>
          <CenterJustifiedSpinner />
        </KibanaPageTemplate.Section>
      ) : (
        <KibanaPageTemplate.Section
          paddingSize="none"
          grow
          restrictWidth={false}
          css={css`
            min-height: 0;
          `}
          contentProps={{
            css: css`
              flex: 1 1;
              min-height: 0;
            `,
          }}
        >
          <EuiSplitPanel.Outer
            direction="row"
            hasBorder={false}
            hasShadow={false}
            css={css`
              ${largeMediaQuery} {
                height: 100%;
              }
            `}
          >
            <EuiSplitPanel.Inner
              grow
              paddingSize="none"
              css={css`
                ${largeMediaQuery} {
                  // Surgically pad the doc-viewer table's search-input row
                  // and the toggles row on the right so the controls don't
                  // sit flush against the panel edge. Each \`:has()\` is
                  // anchored on a stable direct child so the rule matches
                  // the exact EuiFlexItem wrapper and not any ancestor that
                  // happens to contain the descendant: the search row's
                  // direct child is an \`EuiFormControlLayout\` (the search
                  // input wrapper), and the toggles row's direct child is
                  // an \`EuiFlexGroup\` containing \`EuiSwitch\` items.
                  [class*='euiFlexItem']:has(
                      > [class*='euiFormControlLayout']
                        [data-test-subj='unifiedDocViewerFieldsSearchInput']
                    ),
                  [class*='euiFlexItem']:has(
                      > [class*='euiFlexGroup'] > [class*='euiFlexItem'] > [class*='euiSwitch']
                    ) {
                    padding-right: ${euiTheme.size.s};
                  }
                }
              `}
            >
              {mainPanel === 'metadata' ? (
                <AlertEpisodeMetadataSection episodeId={episodeId} services={metadataServices} />
              ) : (
                <EuiPanel
                  hasBorder={false}
                  hasShadow={false}
                  paddingSize="l"
                  css={css`
                    ${smallMediaQuery} {
                      ${logicalCSS('padding-horizontal', '0')}
                    }
                    ${largeMediaQuery} {
                      height: 100%;
                      overflow-y: auto;
                      ${logicalCSS('padding-left', '0')}
                    }
                  `}
                >
                  <AlertEpisodeLifecycleHeatmapSection
                    episodeId={episodeId}
                    services={detailsServices}
                  />
                  <EuiSpacer size="l" />
                  <AlertEpisodesRelatedSection
                    episodeId={episodeId}
                    services={detailsServices}
                    getEpisodeDetailsHref={getEpisodeDetailsHref}
                  />
                </EuiPanel>
              )}
            </EuiSplitPanel.Inner>
            {sidebarPanelInner}
          </EuiSplitPanel.Outer>
        </KibanaPageTemplate.Section>
      )}
    </KibanaPageTemplate>
  );
}

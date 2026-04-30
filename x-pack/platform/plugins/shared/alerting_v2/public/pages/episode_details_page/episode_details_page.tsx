/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  logicalCSS,
  useEuiMinBreakpoint,
  useEuiMaxBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useQueryClient } from '@kbn/react-query';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetchEpisodeEventsQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_events_query';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import {
  getEpisodeDurationMs,
  getGroupHashFromEpisodeRows,
  getLastEpisodeStatus,
  getRuleIdFromEpisodeRows,
  getTriggeredTimestamp,
} from '@kbn/alerting-v2-episodes-ui/utils/episode_series_derived';
import { createEpisodeActions, type EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import { EpisodeActionsBar } from '@kbn/alerting-v2-episodes-ui/components/episode_actions_bar';
import { AlertEpisodeTags } from '@kbn/alerting-v2-episodes-ui/components/actions/tags';
import { AlertEpisodeGroupingFields } from '@kbn/alerting-v2-episodes-ui/components/grouping/grouping_fields';
import { AlertEpisodeStatusBadges } from '@kbn/alerting-v2-episodes-ui/components/status/status_badges';
import { css } from '@emotion/react';
import { useHistory, useParams } from 'react-router-dom';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { paths } from '../../constants';
import type { AlertEpisodesKibanaServices } from '../../episodes_kibana_services';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { getDiscoverHrefForRuleAndEpisodeTimestamp } from '../../utils/discover_href_for_episode';
import { EpisodeMetadataTab } from './components/episode_metadata_tab';
import { EpisodeOverviewTab } from './components/episode_overview_tab';
import { EpisodeAssigneeCell } from '../alert_episodes_list_page/components/episode_assignee_cell';
import * as i18n from './translations';

function formatRuleEvaluationEsql(rule: RuleResponse): string {
  return rule.evaluation.query.base;
}

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

  const { data: rule, isLoading: isLoadingRule } = useFetchRule(ruleId);

  const { data: episodeActionsMap, refetch: refetchEpisodeActions } = useFetchEpisodeActions({
    episodeIds: episodeId ? [episodeId] : [],
    expressions,
  });

  const { data: groupActionsMap, refetch: refetchGroupActions } = useFetchGroupActions({
    groupHashes: groupHash ? [groupHash] : [],
    expressions,
  });

  const episodeBreadcrumbTitle =
    rule?.metadata.name != null && rule.metadata.name.length > 0
      ? rule.metadata.name
      : i18n.EPISODE_DETAILS_BREADCRUMB_FALLBACK;

  useBreadcrumbs('episode_details', { ruleName: episodeBreadcrumbTitle });
  const smallMediaQuery = useEuiMaxBreakpoint('s');
  const largeMediaQuery = useEuiMinBreakpoint('m');

  const episodeAction = episodeId ? episodeActionsMap?.get(episodeId) : undefined;
  const groupAction = groupHash ? groupActionsMap?.get(groupHash) : undefined;
  const tags = groupAction?.tags ?? [];

  const lastStatus = useMemo(() => getLastEpisodeStatus(eventRows), [eventRows]);
  const triggeredAt = useMemo(() => getTriggeredTimestamp(eventRows), [eventRows]);
  const durationMs = useMemo(() => getEpisodeDurationMs(eventRows), [eventRows]);

  const hasNoActors = useMemo(
    () =>
      episodeAction?.lastAckAction !== ALERT_EPISODE_ACTION_TYPE.ACK &&
      groupAction?.lastSnoozeAction !== ALERT_EPISODE_ACTION_TYPE.SNOOZE &&
      groupAction?.lastDeactivateAction !== ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
    [episodeAction, groupAction]
  );

  const episodeIsoTimestamp = triggeredAt ?? eventRows[0]?.['@timestamp'];

  const runbookArtifact = useMemo(
    () => rule?.artifacts?.find((artifact) => artifact.type === 'runbook'),
    [rule?.artifacts]
  );

  const ruleOverviewEsql = useMemo(() => (rule ? formatRuleEvaluationEsql(rule) : ''), [rule]);

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
        getEpisodeDetailsHref: (id) =>
          services.http.basePath.prepend(paths.alertEpisodeDetails(id)),
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
        ? episodeActions.filter(
            // We're already on the details page — hide the "View details" action.
            (action) =>
              action.id !== 'ALERTING_V2_VIEW_EPISODE_DETAILS' &&
              action.isCompatible({ episodes: [episode] })
          )
        : [],
    [episodeActions, episode]
  );

  const handleActionSuccess = useCallback(() => {
    refetchEpisodeEvents();
    refetchEpisodeActions();
    refetchGroupActions();
  }, [refetchEpisodeEvents, refetchEpisodeActions, refetchGroupActions]);

  const ruleKindLabel = rule?.kind === 'signal' ? i18n.RULE_KIND_SIGNAL : i18n.RULE_KIND_ALERTING;

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

  const pageTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="l">
          <h1 data-test-subj="alertingV2EpisodeDetailsRuleTitle">
            {rule?.metadata.name ?? i18n.LOADING_RULE_TITLE}
          </h1>
        </EuiTitle>
      </EuiFlexItem>
      {lastStatus ? (
        <EuiFlexItem grow={false}>
          <AlertEpisodeStatusBadges
            status={lastStatus}
            episodeAction={episodeAction}
            groupAction={groupAction}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );

  const ruleDescriptionText =
    rule?.metadata.description != null && rule.metadata.description.length > 0 ? (
      <EuiText size="s" color="subdued">
        {rule.metadata.description}
      </EuiText>
    ) : null;

  const showTagsInHeader = !isLoading && tags.length > 0;
  const tagsInHeader = showTagsInHeader ? (
    <div data-test-subj="alertingV2EpisodeDetailsHeaderTags">
      <AlertEpisodeTags tags={tags} />
    </div>
  ) : null;

  const headerDescription =
    tagsInHeader || ruleDescriptionText ? (
      <>
        {ruleDescriptionText}
        {tagsInHeader && ruleDescriptionText ? <EuiSpacer size="s" /> : null}
        {tagsInHeader}
      </>
    ) : undefined;

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
            <EuiDescriptionList
              compressed
              type="responsiveColumn"
              listItems={[
                {
                  title: i18n.EPISODE_ID_LABEL,
                  description: episodeId ?? '—',
                },
                {
                  title: i18n.GROUPING_LABEL,
                  description: <AlertEpisodeGroupingFields fields={rule?.grouping?.fields ?? []} />,
                },
                {
                  title: i18n.TRIGGERED_LABEL,
                  description: triggeredAt
                    ? new Date(triggeredAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '—',
                },
                {
                  title: i18n.DURATION_LABEL,
                  description:
                    durationMs != null ? i18n.FORMAT_EPISODE_DURATION_MS(durationMs) : '—',
                },
                {
                  title: i18n.ASSIGNEE_LABEL,
                  description: (
                    <EpisodeAssigneeCell
                      assigneeUid={episodeAction?.lastAssigneeUid}
                      userProfile={services.userProfile}
                    />
                  ),
                },
              ]}
            />
            <EuiSpacer size="l" />
            <EuiTitle size="xs">
              <h3 data-test-subj="alertingV2EpisodeDetailsActionsOverviewHeading">
                {i18n.ACTIONS_OVERVIEW_TITLE}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            {hasNoActors ? (
              <EuiText
                size="s"
                color="subdued"
                data-test-subj="alertingV2EpisodeDetailsActionsOverviewEmpty"
              >
                {i18n.ACTIONS_OVERVIEW_EMPTY}
              </EuiText>
            ) : (
              <EuiDescriptionList
                compressed
                type="responsiveColumn"
                listItems={[
                  ...(episodeAction?.lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK
                    ? [
                        {
                          title: i18n.LABEL_ACKNOWLEDGED_BY,
                          description: (
                            <EpisodeAssigneeCell
                              assigneeUid={episodeAction.lastAckActor}
                              userProfile={services.userProfile}
                            />
                          ),
                        },
                      ]
                    : []),
                  ...(groupAction?.lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE
                    ? [
                        {
                          title: i18n.LABEL_RESOLVED_BY,
                          description: (
                            <EpisodeAssigneeCell
                              assigneeUid={groupAction.lastDeactivateActor}
                              userProfile={services.userProfile}
                            />
                          ),
                        },
                      ]
                    : []),
                  ...(groupAction?.lastSnoozeAction === ALERT_EPISODE_ACTION_TYPE.SNOOZE
                    ? [
                        {
                          title: i18n.LABEL_SNOOZED_BY,
                          description: (
                            <EpisodeAssigneeCell
                              assigneeUid={groupAction.lastSnoozeActor}
                              userProfile={services.userProfile}
                            />
                          ),
                        },
                        {
                          title: i18n.LABEL_SNOOZED_UNTIL,
                          description: groupAction.snoozeExpiry
                            ? new Date(groupAction.snoozeExpiry).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : '—',
                        },
                      ]
                    : []),
                ]}
              />
            )}
            {rule ? (
              <>
                <EuiSpacer size="l" />
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="spaceBetween"
                  responsive={false}
                  gutterSize="s"
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3 data-test-subj="alertingV2EpisodeDetailsRuleOverviewHeading">
                        {i18n.RULE_OVERVIEW_TITLE}
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      color="text"
                      iconType="eye"
                      href={http.basePath.prepend(paths.ruleDetails(rule.id))}
                      data-test-subj="alertingV2EpisodeDetailsViewRuleDetailsButton"
                    >
                      {i18n.VIEW_RULE_DETAILS}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  data-test-subj="alertingV2EpisodeDetailsRuleOverviewPanel"
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <strong>{rule.metadata.name}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        |
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="bell" size="s" aria-hidden />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="xs" color="subdued">
                            {ruleKindLabel}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        |
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge
                        color={rule.enabled ? 'success' : 'default'}
                        data-test-subj="alertingV2EpisodeDetailsRuleStatusBadge"
                      >
                        {rule.enabled ? i18n.RULE_STATUS_ENABLED : i18n.RULE_STATUS_DISABLED}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                  <EuiCodeBlock
                    language="esql"
                    fontSize="s"
                    paddingSize="s"
                    isCopyable
                    overflowHeight={240}
                    data-test-subj="alertingV2EpisodeDetailsRuleQueryCodeBlock"
                  >
                    {ruleOverviewEsql}
                  </EuiCodeBlock>
                </EuiPanel>
              </>
            ) : null}
          </>
        ) : runbookArtifact?.value != null && runbookArtifact.value.length > 0 ? (
          <EuiMarkdownFormat
            textSize="s"
            css={css`
              word-wrap: break-word;
            `}
            data-test-subj="alertingV2EpisodeDetailsRunbookContent"
          >
            {runbookArtifact.value}
          </EuiMarkdownFormat>
        ) : (
          <EuiText size="s" color="subdued" data-test-subj="alertingV2EpisodeDetailsRunbookEmpty">
            {i18n.RUNBOOK_EMPTY}
          </EuiText>
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
        pageTitle,
        description: headerDescription,
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
                ${smallMediaQuery} {
                  [class*='InternalDocViewerTable'] {
                    display: block;
                    height: unset;
                  }
                }

                ${largeMediaQuery} {
                  // The docs viewer uses a fixed height behavior by default, so
                  // we need set the height to 100% to make sure it fills the panel
                  [class*='InternalDocViewerTable'] {
                    height: 100%;

                    & > :nth-child(2),
                    & > :nth-child(4) {
                      padding-right: ${euiTheme.size.s};
                    }
                  }
                }
              `}
            >
              {mainPanel === 'metadata' ? (
                <EpisodeMetadataTab episodeId={episodeId} ruleQuery={rule?.evaluation.query.base} />
              ) : (
                <EpisodeOverviewTab
                  episodeId={episodeId}
                  eventRows={eventRows}
                  groupHash={groupHash}
                  rule={rule}
                />
              )}
            </EuiSplitPanel.Inner>
            {sidebarPanelInner}
          </EuiSplitPanel.Outer>
        </KibanaPageTemplate.Section>
      )}
    </KibanaPageTemplate>
  );
}

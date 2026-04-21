/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo, useState } from 'react';
import {
  EuiAccordion,
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
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetchEpisodeEventsQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_events_query';
import { RELATED_ALERT_EPISODES_PAGE_SIZE } from '@kbn/alerting-v2-episodes-ui/constants';
import { RelatedAlertEpisode } from '@kbn/alerting-v2-episodes-ui/components/related/related_alert_episode';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import { useFetchRelatedAlertEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_related_alert_episodes_query';
import {
  getEpisodeDurationMs,
  getGroupHashFromEpisodeRows,
  getLastEpisodeStatus,
  getRuleIdFromEpisodeRows,
  getTriggeredTimestamp,
} from '@kbn/alerting-v2-episodes-ui/utils/episode_series_derived';
import { AlertEpisodeActions } from '@kbn/alerting-v2-episodes-ui/components/actions/actions';
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

const EpisodeLifecycleHeatmap = React.lazy(() =>
  import('./components/episode_lifecycle_heatmap').then((module) => ({
    default: module.EpisodeLifecycleHeatmap,
  }))
);

const episodeDetailsBreadcrumbFallback = i18n.translate(
  'xpack.alertingV2.breadcrumbs.episodeDetailsFallback',
  {
    defaultMessage: 'Episode',
  }
);

function formatDurationMs(ms: number): string {
  if (ms < 1000) {
    return i18n.translate('xpack.alertingV2.episodeDetails.durationMs', {
      defaultMessage: '{ms} ms',
      values: { ms: Math.round(ms) },
    });
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return i18n.translate('xpack.alertingV2.episodeDetails.durationDays', {
      defaultMessage: '{days} d',
      values: { days },
    });
  }
  if (hours > 0) {
    return i18n.translate('xpack.alertingV2.episodeDetails.durationHours', {
      defaultMessage: '{hours} h',
      values: { hours },
    });
  }
  if (minutes > 0) {
    return i18n.translate('xpack.alertingV2.episodeDetails.durationMinutes', {
      defaultMessage: '{minutes} min',
      values: { minutes },
    });
  }
  return i18n.translate('xpack.alertingV2.episodeDetails.durationSeconds', {
    defaultMessage: '{seconds} s',
    values: { seconds },
  });
}

function formatRuleEvaluationEsql(rule: RuleResponse): string {
  return rule.evaluation.query.base;
}

interface EpisodeRouteParams {
  episodeId: string;
}

type EpisodeDetailsSidebarPanel = 'episode_details' | 'runbook';

export function EpisodeDetailsPage() {
  const { episodeId } = useParams<EpisodeRouteParams>();
  const [sidebarPanel, setSidebarPanel] = useState<EpisodeDetailsSidebarPanel>('episode_details');
  const { services } = useKibana<AlertEpisodesKibanaServices>();
  const { euiTheme } = useEuiTheme();
  const { data, notifications, http, expressions } = services;
  const history = useHistory();

  const {
    data: eventRows = [],
    isLoading: isLoadingEvents,
    isError: isEventsError,
  } = useFetchEpisodeEventsQuery({
    episodeId,
    data,
  });

  const ruleId = useMemo(() => getRuleIdFromEpisodeRows(eventRows), [eventRows]);
  const groupHash = useMemo(() => getGroupHashFromEpisodeRows(eventRows), [eventRows]);

  const { data: rule, isLoading: isLoadingRule } = useFetchRule(ruleId);

  const { data: episodeActionsMap } = useFetchEpisodeActions({
    episodeIds: episodeId ? [episodeId] : [],
    services,
  });

  const { data: groupActionsMap } = useFetchGroupActions({
    groupHashes: groupHash ? [groupHash] : [],
    services,
  });

  const { data: relatedEpisodeRows = [], isLoading: isLoadingRelatedEpisodes } =
    useFetchRelatedAlertEpisodesQuery({
      ruleId,
      excludeEpisodeId: episodeId,
      pageSize: RELATED_ALERT_EPISODES_PAGE_SIZE,
      services: { ...services, expressions },
      toastDanger: (message) => notifications.toasts.addDanger(message),
    });

  const relatedEpisodeIds = useMemo(
    () => relatedEpisodeRows.map((row) => row['episode.id']).filter(Boolean),
    [relatedEpisodeRows]
  );

  const relatedGroupHashes = useMemo(
    () => [
      ...new Set(
        relatedEpisodeRows
          .map((row) => row.group_hash)
          .filter((hash): hash is string => Boolean(hash))
      ),
    ],
    [relatedEpisodeRows]
  );

  const { data: relatedEpisodeActionsMap } = useFetchEpisodeActions({
    episodeIds: relatedEpisodeIds,
    services: { expressions },
  });

  const { data: relatedGroupActionsMap } = useFetchGroupActions({
    groupHashes: relatedGroupHashes,
    services: { expressions },
  });

  const episodeBreadcrumbTitle =
    rule?.metadata.name != null && rule.metadata.name.length > 0
      ? rule.metadata.name
      : episodeDetailsBreadcrumbFallback;

  useBreadcrumbs('episode_details', { ruleName: episodeBreadcrumbTitle });

  const episodeAction = episodeId ? episodeActionsMap?.get(episodeId) : undefined;
  const groupAction = groupHash ? groupActionsMap?.get(groupHash) : undefined;
  const tags = groupAction?.tags ?? [];

  const lastStatus = useMemo(() => getLastEpisodeStatus(eventRows), [eventRows]);
  const triggeredAt = useMemo(() => getTriggeredTimestamp(eventRows), [eventRows]);
  const durationMs = useMemo(() => getEpisodeDurationMs(eventRows), [eventRows]);

  const episodeIsoTimestamp = triggeredAt ?? eventRows[0]?.['@timestamp'];

  const runbookArtifact = useMemo(
    () => rule?.artifacts?.find((artifact) => artifact.type === 'runbook'),
    [rule?.artifacts]
  );

  const ruleOverviewEsql = useMemo(() => (rule ? formatRuleEvaluationEsql(rule) : ''), [rule]);

  const openInDiscoverHref = useMemo(() => {
    if (!rule) {
      return undefined;
    }
    return getDiscoverHrefForRuleAndEpisodeTimestamp({
      share: services.share,
      capabilities: services.application.capabilities,
      uiSettings: services.uiSettings,
      ruleEsql: rule.evaluation?.query?.base,
      episodeIsoTimestamp,
    });
  }, [
    episodeIsoTimestamp,
    rule,
    services.application.capabilities,
    services.share,
    services.uiSettings,
  ]);

  const ruleKindLabel =
    rule?.kind === 'signal'
      ? i18n.translate('xpack.alertingV2.episodeDetails.ruleKindSignal', {
          defaultMessage: 'Signal',
        })
      : i18n.translate('xpack.alertingV2.episodeDetails.ruleKindAlerting', {
          defaultMessage: 'Alerting',
        });

  const isLoading = isLoadingEvents || (Boolean(ruleId) && isLoadingRule);
  const episodeNotFound = !isLoading && eventRows.length === 0;

  if (!episodeId || episodeNotFound || isEventsError) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="danger"
        title={
          <h2>
            {i18n.translate('xpack.alertingV2.episodes.episodeNotFoundTitle', {
              defaultMessage: 'Unable to load episode',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.alertingV2.episodes.episodeNotFoundBody', {
              defaultMessage:
                'The alert episode could not be found or an error occurred while loading it.',
            })}
          </p>
        }
        actions={[
          <EuiButton
            color="primary"
            fill
            onClick={() => history.push('/')}
            data-test-subj="episodeDetailsErrorBackButton"
          >
            {i18n.translate('xpack.alertingV2.episodes.backToEpisodes', {
              defaultMessage: 'Back to alert episodes',
            })}
          </EuiButton>,
        ]}
        data-test-subj="episodeDetailsErrorPrompt"
      />
    );
  }

  const pageTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={true} wrap>
      <EuiFlexItem grow={false}>
        <EuiTitle size="l">
          <h1 data-test-subj="alertingV2EpisodeDetailsRuleTitle">
            {rule?.metadata.name ??
              i18n.translate('xpack.alertingV2.episodeDetails.loadingRuleTitle', {
                defaultMessage: 'Episode details',
              })}
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

  const episodeDetailsSidebarTitle = i18n.translate(
    'xpack.alertingV2.episodeDetails.sidebarTitle',
    {
      defaultMessage: 'Episode details',
    }
  );

  const runbookSidebarTitle = i18n.translate('xpack.alertingV2.episodeDetails.runbookTitle', {
    defaultMessage: 'Runbook',
  });

  const sidebarHeaderTitle =
    sidebarPanel === 'episode_details' ? episodeDetailsSidebarTitle : runbookSidebarTitle;

  const sidebar = (
    <>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
        css={css`
          flex-grow: 0;
          padding: ${euiTheme.size.l};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2 data-test-subj="alertingV2EpisodeDetailsSidebarTitle">{sidebarHeaderTitle}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.alertingV2.episodeDetails.sidebarViewLegend', {
              defaultMessage: 'Sidebar section',
            })}
            type="single"
            buttonSize="compressed"
            idSelected={sidebarPanel}
            onChange={(id) => setSidebarPanel(id as EpisodeDetailsSidebarPanel)}
            options={[
              {
                id: 'episode_details',
                'data-test-subj': 'alertingV2EpisodeDetailsSidebarTabEpisodeDetails',
                label: i18n.translate('xpack.alertingV2.episodeDetails.sidebarTabTitle', {
                  defaultMessage: 'Details',
                }),
              },
              {
                id: 'runbook',
                'data-test-subj': 'alertingV2EpisodeDetailsSidebarTabRunbook',
                label: runbookSidebarTitle,
              },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule
        css={css`
          margin-block: 0;
          margin-inline: ${euiTheme.size.l};
          inline-size: unset;
        `}
      />
      <div
        css={css`
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: ${euiTheme.size.l};
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
                  title: i18n.translate('xpack.alertingV2.episodeDetails.episodeIdLabel', {
                    defaultMessage: 'Alert episode id',
                  }),
                  description: episodeId ?? '—',
                },
                {
                  title: i18n.translate('xpack.alertingV2.episodeDetails.groupingLabel', {
                    defaultMessage: 'Grouping',
                  }),
                  description: <AlertEpisodeGroupingFields fields={rule?.grouping?.fields ?? []} />,
                },
                {
                  title: i18n.translate('xpack.alertingV2.episodeDetails.triggeredLabel', {
                    defaultMessage: 'Triggered',
                  }),
                  description: triggeredAt
                    ? new Date(triggeredAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '—',
                },
                {
                  title: i18n.translate('xpack.alertingV2.episodeDetails.durationLabel', {
                    defaultMessage: 'Duration',
                  }),
                  description: durationMs != null ? formatDurationMs(durationMs) : '—',
                },
              ]}
            />
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
                    <EuiTitle size="xxs">
                      <h3 data-test-subj="alertingV2EpisodeDetailsRuleOverviewHeading">
                        {i18n.translate('xpack.alertingV2.episodeDetails.ruleOverviewTitle', {
                          defaultMessage: 'Rule overview',
                        })}
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
                      {i18n.translate('xpack.alertingV2.episodeDetails.viewRuleDetails', {
                        defaultMessage: 'View rule details',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  data-test-subj="alertingV2EpisodeDetailsRuleOverviewPanel"
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={true} wrap>
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
                        {rule.enabled
                          ? i18n.translate('xpack.alertingV2.episodeDetails.ruleStatusEnabled', {
                              defaultMessage: 'Enabled',
                            })
                          : i18n.translate('xpack.alertingV2.episodeDetails.ruleStatusDisabled', {
                              defaultMessage: 'Disabled',
                            })}
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
            {i18n.translate('xpack.alertingV2.episodeDetails.runbookEmpty', {
              defaultMessage: 'No runbook has been added to this rule.',
            })}
          </EuiText>
        )}
      </div>
    </>
  );

  return (
    <KibanaPageTemplate
      paddingSize="none"
      bottomBorder={false}
      data-test-subj="alertingV2EpisodeDetailsPage"
    >
      {isLoading ? (
        <KibanaPageTemplate.Section grow>
          <CenterJustifiedSpinner />
        </KibanaPageTemplate.Section>
      ) : (
        <>
          <KibanaPageTemplate.Header
            pageTitle={pageTitle}
            description={headerDescription}
            bottomBorder
            rightSideItems={[
              <AlertEpisodeActions
                key="alertingV2EpisodeHeaderActions"
                episodeId={episodeId}
                groupHash={groupHash}
                episodeAction={episodeAction}
                groupAction={groupAction}
                http={http}
                openInDiscoverHref={openInDiscoverHref}
                expressions={expressions}
                buttonsOutlined={false}
              />,
            ]}
            rightSideGroupProps={{ gutterSize: 's' }}
          />
          <KibanaPageTemplate.Section paddingSize="none" grow>
            <EuiSplitPanel.Outer direction="row" hasBorder={false} hasShadow={false} grow>
              <EuiSplitPanel.Inner grow paddingSize="l">
                <Suspense fallback={<EuiLoadingSpinner size="l" />}>
                  <EpisodeLifecycleHeatmap eventRows={eventRows} />
                </Suspense>
                <EuiSpacer size="l" />
                {rule ? (
                  <EuiAccordion
                    id="alertingV2RelatedAlertEpisodes"
                    paddingSize="none"
                    buttonProps={{
                      paddingSize: 'm',
                      css: css`
                        .euiAccordion__buttonContent {
                          width: 100%;
                        }
                      `,
                    }}
                    buttonContent={
                      <EuiText>
                        <h3>
                          {i18n.translate('xpack.alertingV2.episodeDetails.relatedEpisodesTitle', {
                            defaultMessage: 'Related alert episodes',
                          })}
                        </h3>
                      </EuiText>
                    }
                    initialIsOpen
                    data-test-subj="alertingV2RelatedAlertEpisodesAccordion"
                  >
                    {isLoadingRelatedEpisodes ? (
                      <EuiFlexGroup justifyContent="center">
                        <EuiFlexItem grow={false}>
                          <EuiLoadingSpinner size="l" />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ) : relatedEpisodeRows.length === 0 ? (
                      <EuiPanel
                        color="subdued"
                        hasShadow={false}
                        paddingSize="m"
                        data-test-subj="alertingV2RelatedEpisodesEmpty"
                      >
                        <EuiFlexGroup justifyContent="center" alignItems="center">
                          <EuiFlexItem grow={false}>
                            <EuiText size="s" color="subdued" textAlign="center">
                              {i18n.translate(
                                'xpack.alertingV2.episodeDetails.relatedEpisodesEmpty',
                                {
                                  defaultMessage: 'No related episodes found.',
                                }
                              )}
                            </EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                    ) : (
                      <EuiFlexGroup direction="column" gutterSize="s">
                        {relatedEpisodeRows.map((row) => {
                          const relatedId = row['episode.id'];
                          const relatedGroupHash = row.group_hash;
                          return (
                            <RelatedAlertEpisode
                              key={relatedId}
                              episode={row}
                              rule={rule}
                              episodeAction={relatedEpisodeActionsMap?.get(relatedId)}
                              groupAction={
                                relatedGroupHash
                                  ? relatedGroupActionsMap?.get(relatedGroupHash)
                                  : undefined
                              }
                              href={http.basePath.prepend(paths.alertEpisodeDetails(relatedId))}
                            />
                          );
                        })}
                      </EuiFlexGroup>
                    )}
                  </EuiAccordion>
                ) : null}
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner
                grow={false}
                paddingSize="none"
                css={css`
                  flex-shrink: 0;
                  flex-basis: 400px;
                  min-width: 40px;
                  max-width: 500px;
                  border-left: ${euiTheme.border.thin};
                  display: flex;
                  flex-direction: column;
                  min-height: 0;
                `}
                data-test-subj="alertingV2EpisodeDetailsSidebar"
              >
                {sidebar}
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </KibanaPageTemplate.Section>
        </>
      )}
    </KibanaPageTemplate>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  logicalCSS,
  useEuiMaxBreakpoint,
  useEuiMinBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { RELATED_ALERT_EPISODES_PAGE_SIZE } from '@kbn/alerting-v2-episodes-ui/constants';
import { RelatedAlertEpisode } from '@kbn/alerting-v2-episodes-ui/components/related/related_alert_episode';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import { useFetchRelatedAlertEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_related_alert_episodes_query';
import type { EpisodeEventRow } from '@kbn/alerting-v2-episodes-ui/queries/episode_events_query';
import type { AlertEpisodesKibanaServices } from '../../../episodes_kibana_services';
import { paths } from '../../../constants';

const EpisodeLifecycleHeatmap = React.lazy(() =>
  import('./episode_lifecycle_heatmap').then((module) => ({
    default: module.EpisodeLifecycleHeatmap,
  }))
);

interface EpisodeOverviewTabProps {
  episodeId: string;
  eventRows: EpisodeEventRow[];
  rule: RuleResponse | undefined;
}

export const EpisodeOverviewTab = ({ episodeId, eventRows, rule }: EpisodeOverviewTabProps) => {
  const { services } = useKibana<AlertEpisodesKibanaServices>();
  const { notifications, http, expressions } = services;

  const { data: relatedEpisodeRows = [], isLoading: isLoadingRelatedEpisodes } =
    useFetchRelatedAlertEpisodesQuery({
      ruleId: rule?.id,
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

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="l"
      css={css`
        ${useEuiMaxBreakpoint('s')} {
          ${logicalCSS('padding-horizontal', '0')}
        }

        ${useEuiMinBreakpoint('m')} {
          height: 100%;
          overflow-y: auto;
          ${logicalCSS('padding-left', '0')}
        }
      `}
    >
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
                    {i18n.translate('xpack.alertingV2.episodeDetails.relatedEpisodesEmpty', {
                      defaultMessage: 'No related episodes found.',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          ) : (
            <EuiFlexGroup direction="column" gutterSize="s">
              {relatedEpisodeRows.map((row) => {
                const relatedId = row['episode.id'];
                if (!relatedId) {
                  return null;
                }
                const relatedGroupHash = row.group_hash;
                return (
                  <RelatedAlertEpisode
                    key={relatedId}
                    episode={row}
                    rule={rule}
                    episodeAction={relatedEpisodeActionsMap?.get(relatedId)}
                    groupAction={
                      relatedGroupHash ? relatedGroupActionsMap?.get(relatedGroupHash) : undefined
                    }
                    href={http.basePath.prepend(paths.alertEpisodeDetails(relatedId))}
                  />
                );
              })}
            </EuiFlexGroup>
          )}
        </EuiAccordion>
      ) : null}
    </EuiPanel>
  );
};

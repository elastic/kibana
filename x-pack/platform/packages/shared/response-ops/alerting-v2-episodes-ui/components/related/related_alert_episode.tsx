/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../../queries/episodes_query';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
import { AlertEpisodeGroupingFields } from '../grouping/grouping_fields';
import { AlertEpisodeStatusBadges } from '../status/status_badges';

export interface RelatedAlertEpisodeProps {
  episode: AlertEpisode;
  rule: RuleResponse;
  episodeAction?: EpisodeActionState;
  groupAction?: AlertEpisodeGroupAction;
  href: string;
}

export function RelatedAlertEpisode({
  episode,
  rule,
  episodeAction,
  groupAction,
  href,
}: RelatedAlertEpisodeProps) {
  const status = episode['episode.status'];
  const episodeId = episode['episode.id'];
  return (
    <EuiCard
      display="subdued"
      paddingSize="m"
      href={href}
      textAlign="left"
      titleSize="xs"
      titleElement="h3"
      title={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={true} wrap>
          <EuiFlexItem grow={false}>{rule.metadata.name}</EuiFlexItem>
          {status ? (
            <EuiFlexItem grow={false}>
              <AlertEpisodeStatusBadges
                status={status}
                episodeAction={episodeAction}
                groupAction={groupAction}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      }
      data-test-subj={
        episodeId != null ? `relatedAlertEpisode-${episodeId}` : 'relatedAlertEpisode'
      }
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        wrap
        data-test-subj="relatedAlertEpisodeGrouping"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertingV2EpisodesUi.relatedAlertEpisode.groupingLabel', {
              defaultMessage: 'Grouping',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AlertEpisodeGroupingFields fields={rule.grouping?.fields ?? []} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCard>
  );
}

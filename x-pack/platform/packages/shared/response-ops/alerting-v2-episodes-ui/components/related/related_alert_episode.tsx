/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertEpisodeStatus, RuleResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeAction, AlertEpisodeGroupAction } from '../../types/action';
import { AlertEpisodeGroupingFields } from '../grouping/grouping_fields';
import { AlertEpisodeStatusBadges } from '../status/status_badges';

export interface RelatedAlertEpisodeProps {
  episode: Record<string, unknown>;
  rule: RuleResponse;
  episodeAction?: AlertEpisodeAction;
  groupAction?: AlertEpisodeGroupAction;
  onNavigate: () => void;
}

export function RelatedAlertEpisode({
  episode,
  rule,
  episodeAction,
  groupAction,
  onNavigate,
}: RelatedAlertEpisodeProps) {
  const status = episode['episode.status'] as AlertEpisodeStatus | undefined;
  const episodeId = episode['episode.id'] as string | undefined;
  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      color="subdued"
      grow={false}
      onClick={onNavigate}
      data-test-subj={
        episodeId != null ? `relatedAlertEpisode-${episodeId}` : 'relatedAlertEpisode'
      }
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={true} wrap>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>{rule.metadata.name}</h3>
            </EuiTitle>
          </EuiFlexItem>
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
      </EuiFlexGroup>
    </EuiPanel>
  );
}

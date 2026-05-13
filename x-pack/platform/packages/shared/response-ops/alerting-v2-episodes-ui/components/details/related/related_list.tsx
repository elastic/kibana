/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import {
  RelatedAlertEpisode,
  type RelatedAlertEpisodeProps,
} from '../../related/related_alert_episode';
import type { AlertEpisode } from '../../../queries/episodes_query';

export interface RelatedAlertEpisodesListProps {
  rows: AlertEpisode[];
  rule: RuleResponse;
  getEpisodeAction: (episodeId: string) => RelatedAlertEpisodeProps['episodeAction'];
  getGroupAction: (groupHash: string) => RelatedAlertEpisodeProps['groupAction'];
  getEpisodeDetailsHref: (episodeId: string) => string;
  /**
   * Render each card with smaller padding. Forwarded as `compact` to
   * `RelatedAlertEpisode`.
   */
  compact?: boolean;
}

export function RelatedAlertEpisodesList({
  rows,
  rule,
  getEpisodeAction,
  getGroupAction,
  getEpisodeDetailsHref,
  compact = false,
}: RelatedAlertEpisodesListProps) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="alertingV2RelatedEpisodesList">
      {rows.map((row) => {
        const relatedId = row['episode.id'];
        const relatedGroupHash = row.group_hash;
        return (
          <RelatedAlertEpisode
            key={relatedId}
            episode={row}
            rule={rule}
            episodeAction={getEpisodeAction(relatedId)}
            groupAction={relatedGroupHash ? getGroupAction(relatedGroupHash) : undefined}
            href={getEpisodeDetailsHref(relatedId)}
            compact={compact}
          />
        );
      })}
    </EuiFlexGroup>
  );
}

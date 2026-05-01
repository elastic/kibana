/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  RelatedAlertEpisode,
  type RelatedAlertEpisodeProps,
} from '@kbn/alerting-v2-episodes-ui/components/related/related_alert_episode';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { paths } from '../../constants';
import type { AlertEpisodesKibanaServices } from '../../episodes_kibana_services';

export function RelatedAlertEpisodesList({
  rows,
  rule,
  getEpisodeAction,
  getGroupAction,
}: {
  rows: AlertEpisode[];
  rule: RuleResponse;
  getEpisodeAction: (episodeId: string) => RelatedAlertEpisodeProps['episodeAction'];
  getGroupAction: (groupHash: string) => RelatedAlertEpisodeProps['groupAction'];
}) {
  const {
    services: { http },
  } = useKibana<AlertEpisodesKibanaServices>();

  const getEpisodeDetailsHref = useCallback(
    (episodeId: string) => http.basePath.prepend(paths.alertEpisodeDetails(episodeId)),
    [http]
  );

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
          />
        );
      })}
    </EuiFlexGroup>
  );
}

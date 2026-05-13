/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFetchEpisodeEventsQuery } from '../../hooks/use_fetch_episode_events_query';
import { useFetchEpisodeActions } from '../../hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '../../hooks/use_fetch_group_actions';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import {
  getGroupHashFromEpisodeRows,
  getLastEpisodeStatus,
  getRuleIdFromEpisodeRows,
} from '../../utils/episode_series_derived';
import { AlertEpisodeDetailsHeader } from './details_header';
import type { AlertEpisodeDetailsServices } from './types';

export interface AlertEpisodeDetailsHeaderSectionProps {
  episodeId: string;
  services: AlertEpisodeDetailsServices;
}

export const AlertEpisodeDetailsHeaderSection = ({
  episodeId,
  services,
}: AlertEpisodeDetailsHeaderSectionProps) => {
  const { data: eventRows } = useFetchEpisodeEventsQuery({ episodeId, data: services.data });
  const rows = eventRows ?? [];

  const ruleId = getRuleIdFromEpisodeRows(rows);
  const groupHash = getGroupHashFromEpisodeRows(rows);
  const lastStatus = getLastEpisodeStatus(rows);

  const { data: episodeActionsMap } = useFetchEpisodeActions({
    episodeIds: [episodeId],
    expressions: services.expressions,
  });
  const { data: groupActionsMap } = useFetchGroupActions({
    groupHashes: groupHash ? [groupHash] : [],
    expressions: services.expressions,
  });
  const { data: rule } = useFetchRule({ id: ruleId, http: services.http });

  const episodeAction = episodeActionsMap?.get(episodeId);
  const groupAction = groupHash ? groupActionsMap?.get(groupHash) : undefined;
  const tags = groupAction?.tags ?? [];

  return (
    <AlertEpisodeDetailsHeader
      title={rule?.metadata.name}
      description={rule?.metadata.description}
      tags={tags}
      status={lastStatus}
      episodeAction={episodeAction}
      groupAction={groupAction}
    />
  );
};

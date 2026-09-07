/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EPISODE_ATTACHMENT_TYPE,
  type AlertEpisode,
  type EpisodeAttachmentData,
  type RuleResponse,
} from '@kbn/alerting-v2-schemas';
import { parseEpisodeDataJson } from '@kbn/alerting-v2-utils';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { alertEpisodeToEpisodeAttachment } from '../common/episode_mappers';
import { AddToChatButton } from './add_to_chat_button';
import type { AttachmentConverter } from './attachment_converter';

interface FocusedEpisode {
  episode: AlertEpisode;
  ruleName?: string;
  groupingFields?: readonly string[];
}

const episodeAttachmentConverter: AttachmentConverter<FocusedEpisode> = {
  toAttachment: (
    focused
  ): AttachmentInput<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData> => ({
    id: `episode:${focused.episode['episode.id']}`,
    type: EPISODE_ATTACHMENT_TYPE,
    origin: focused.episode['episode.id'],
    data: alertEpisodeToEpisodeAttachment(focused.episode, {
      ruleName: focused.ruleName,
      groupingFields: focused.groupingFields,
    }),
  }),
  getOrigin: (focused) => focused.episode['episode.id'],
};

export const EpisodeAddToChatButton = ({
  episode,
  rule,
}: {
  episode: AlertEpisode;
  rule?: RuleResponse;
}): React.ReactElement | null => {
  const episodeData = parseEpisodeDataJson(episode.episode_data);
  const episodeDataRuleName =
    typeof episodeData.rule_name === 'string' ? episodeData.rule_name : undefined;
  const ruleName = rule?.metadata.name ?? episodeDataRuleName;
  const groupingFields = rule?.grouping?.fields;

  const focused: FocusedEpisode = useMemo(
    () => ({ episode, ruleName, groupingFields }),
    [episode, ruleName, groupingFields]
  );

  return (
    <AddToChatButton
      item={focused}
      converter={episodeAttachmentConverter}
      data-test-subj="alertingV2EpisodeAddToChatButton"
    />
  );
};

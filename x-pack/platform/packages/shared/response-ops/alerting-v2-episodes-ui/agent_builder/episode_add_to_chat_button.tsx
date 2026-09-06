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
import { AddToChatButton } from './add_to_chat_button';
import type { AttachmentConverter } from './attachment_converter';

interface FocusedEpisode {
  episode: AlertEpisode;
  ruleName?: string;
  groupingFields?: readonly string[];
}

const mapNullFieldsToUndefined = <T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T]: Exclude<T[K], null> } => {
  const result = {} as { [K in keyof T]: Exclude<T[K], null> };
  for (const key of Object.keys(obj) as Array<keyof T>) {
    const value = obj[key];
    result[key] = (value === null ? undefined : value) as Exclude<T[keyof T], null>;
  }
  return result;
};

const toEpisodeAttachmentData = (episode: AlertEpisode, ruleName?: string): EpisodeAttachmentData =>
  mapNullFieldsToUndefined({
    '@timestamp': episode['@timestamp'],
    'episode.id': episode['episode.id'],
    'episode.label': ruleName ?? episode['rule.id'],
    'episode.status': episode['episode.status'],
    'rule.id': episode['rule.id'],
    group_hash: episode.group_hash,
    first_timestamp: episode.first_timestamp,
    last_timestamp: episode.last_timestamp,
    duration: episode.duration,
    triggered_at: episode.triggered_at,
    last_ack_action: episode.last_ack_action,
    last_assignee_uid: episode.last_assignee_uid,
    last_snooze_action: episode.last_snooze_action,
    snooze_expiry: episode.snooze_expiry,
    last_tags: episode.last_tags,
    episode_data: episode.episode_data,
    severity: episode.severity,
  });

const episodeAttachmentConverter: AttachmentConverter<FocusedEpisode> = {
  toAttachment: (
    focused
  ): AttachmentInput<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData> => ({
    id: `episode:${focused.episode['episode.id']}`,
    type: EPISODE_ATTACHMENT_TYPE,
    origin: focused.episode['episode.id'],
    data: toEpisodeAttachmentData(focused.episode, focused.ruleName),
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { AlertEpisode, RuleResponse } from '@kbn/alerting-v2-schemas';
import { parseEpisodeDataJson } from '@kbn/alerting-v2-utils';
import { AddToChatButton } from './add_to_chat_button';
import { episodeAttachmentConverter } from '../../episode_attachment_converter';
import type { FocusedEpisode } from '../../types';
import type { ManualAddToChatServices } from './use_manual_add_to_chat';

export const EpisodeAddToChatButton = ({
  episode,
  rule,
  services,
}: {
  episode: AlertEpisode;
  rule?: RuleResponse;
  services: ManualAddToChatServices;
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
      services={services}
      data-test-subj="alertingV2EpisodeAddToChatButton"
    />
  );
};

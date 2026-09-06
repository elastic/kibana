/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { AddToChatButton } from './add_to_chat_button';
import { episodeAttachmentConverter, type FocusedEpisode } from './episode_auto_attach';

export const EpisodeAddToChatButton = ({
  episode,
  ruleName,
  groupingFields,
}: {
  episode: AlertEpisode | undefined;
  ruleName?: string;
  groupingFields?: readonly string[];
}): React.ReactElement | null => {
  const focused: FocusedEpisode | undefined = useMemo(
    () => (episode ? { episode, ruleName, groupingFields } : undefined),
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

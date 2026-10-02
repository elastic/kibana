/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { episodeAttachmentConverter } from '../../episode_attachment_converter';
import type { FocusedEpisode } from '../../types';
import { useAutoAttach, type AutoAttachServices } from './use_auto_attach';

export const useEpisodeAutoAttach = (
  episode: AlertEpisode | undefined,
  options: { ruleName?: string; groupingFields?: readonly string[] } | undefined,
  services: AutoAttachServices
): void => {
  const focused: FocusedEpisode | undefined = useMemo(
    () =>
      episode
        ? { episode, ruleName: options?.ruleName, groupingFields: options?.groupingFields }
        : undefined,
    [episode, options?.ruleName, options?.groupingFields]
  );

  useAutoAttach(focused, episodeAttachmentConverter, services);
};

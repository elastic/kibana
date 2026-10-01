/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EpisodeFetchErrorSurface } from '../types/episode_data_source';

export const RELATED_EPISODES_LOAD_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.relatedEpisodes.loadError',
  {
    defaultMessage: 'Failed to load related alert episodes',
  }
);

/** Fetch error toast title per surface, naming the failing source (e.g. `v1`). */
export const EPISODES_FETCH_ERROR_TOAST_TITLE: Record<
  EpisodeFetchErrorSurface,
  (sourceId: string) => string
> = {
  list: (sourceId) =>
    i18n.translate('xpack.alertingV2EpisodesUi.episodes.list.fetchErrorToastTitle', {
      defaultMessage: 'Failed to fetch alert episodes for {sourceId} alerts',
      values: { sourceId },
    }),
  kpis: (sourceId) =>
    i18n.translate('xpack.alertingV2EpisodesUi.episodes.kpis.fetchErrorToastTitle', {
      defaultMessage: 'Failed to fetch KPIs for {sourceId} alerts',
      values: { sourceId },
    }),
  histogram: (sourceId) =>
    i18n.translate('xpack.alertingV2EpisodesUi.episodes.histogram.fetchErrorToastTitle', {
      defaultMessage: 'Failed to fetch histogram data for {sourceId} alerts',
      values: { sourceId },
    }),
};

export const RULE_FIELD_LABEL = i18n.translate('xpack.alertingV2EpisodesUi.ruleFieldLabel', {
  defaultMessage: 'Rule',
});

export const STATUS_FIELD_LABEL = i18n.translate('xpack.alertingV2EpisodesUi.statusFieldLabel', {
  defaultMessage: 'Status',
});

export const SEVERITY_FIELD_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.severityFieldLabel',
  {
    defaultMessage: 'Severity',
  }
);

export const DURATION_FIELD_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.durationFieldLabel',
  {
    defaultMessage: 'Duration',
  }
);

export const ASSIGNEES_FIELD_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.assigneesFieldLabel',
  {
    defaultMessage: 'Assignee',
  }
);

export const RULE_TAGS_FIELD_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.ruleTagsFieldLabel',
  {
    defaultMessage: 'Rule tags',
  }
);

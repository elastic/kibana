/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NAME_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.streamsTreeTable.nameColumnName',
  {
    defaultMessage: 'Name',
  }
);

export const SIGNIFICANT_EVENTS_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.streamsTree.significantEventsColumnName',
  {
    defaultMessage: 'Events',
  }
);

export const SIGNIFICANT_EVENTS_COLUMN_TOOLTIP = i18n.translate(
  'xpack.significantEventsApp.streamsTree.significantEventsColumnTooltip',
  {
    defaultMessage: 'Number of results produced by created rules.',
  }
);

export const QUERIES_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.streamsTree.queriesColumnName',
  {
    defaultMessage: 'KI Queries',
  }
);

export const KNOWLEDGE_INDICATORS_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.streamsTree.knowledgeIndicatorsColumnName',
  {
    defaultMessage: 'KI Features',
  }
);

export const ONBOARDING_STATUS_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.streamsTree.onboardingStatusColumnName',
  {
    defaultMessage: 'Status',
  }
);

export const ACTIONS_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.streamsTree.actionsColumnName',
  {
    defaultMessage: 'Actions',
  }
);

export const NO_STREAMS_MESSAGE = i18n.translate(
  'xpack.significantEventsApp.streamsTree.noStreamsMessage',
  {
    defaultMessage: 'No streams found.',
  }
);

export const STREAMS_TABLE_SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.streamsTree.searchAriaLabel',
  { defaultMessage: 'Search streams by name' }
);

export const STREAMS_TABLE_CAPTION_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.streamsTree.tableCaptionAriaLabel',
  {
    defaultMessage: 'Streams data table, listing stream names with links',
  }
);

export const RUN_STREAM_ONBOARDING_BUTTON_LABEL = i18n.translate(
  'xpack.significantEventsApp.streamsTree.runStreamOnboardingButtonEmptyLabel',
  {
    defaultMessage: 'Onboard stream',
  }
);

export const STOP_STREAM_ONBOARDING_BUTTON_LABEL = i18n.translate(
  'xpack.significantEventsApp.streamsTree.stopStreamOnboardingButtonEmptyLabel',
  {
    defaultMessage: 'Stop stream onboarding',
  }
);

export const ONBOARDING_FAILURE_TITLE = i18n.translate(
  'xpack.significantEventsApp.streamsView.onboardingErrorTitle',
  {
    defaultMessage: 'Could not onboard stream',
  }
);

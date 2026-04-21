/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GENERATE_FEATURES_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.streamsView.generateFeaturesButtonLabel',
  {
    defaultMessage: 'Generate KI Features',
  }
);

export const GENERATE_QUERIES_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.streamsView.generateQueriesButtonLabel',
  {
    defaultMessage: 'Generate KI Queries',
  }
);

export const CONNECTOR_LOAD_ERROR = i18n.translate(
  'xpack.streams.significantEventsDiscovery.streamsView.connectorLoadError',
  {
    defaultMessage: 'Failed to load connectors',
  }
);

export const GENERATE_CONFIG_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.streamsView.generateConfigAriaLabel',
  {
    defaultMessage: 'Configure generation steps and models',
  }
);

export const GENERATE_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.streamsView.generateButtonLabel',
  {
    defaultMessage: 'Generate',
  }
);

export const MODEL_SELECTION_PANEL_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.streamsView.modelSelectionPanelTitle',
  {
    defaultMessage: 'Model selection',
  }
);

export const MODEL_SETTINGS_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.streamsView.modelSettingsLabel',
  {
    defaultMessage: 'Model settings',
  }
);

export const DEFAULT_MODEL_BADGE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.streamsView.defaultModelBadgeLabel',
  {
    defaultMessage: 'Default',
  }
);

export const GENERATE_FEATURES_TOOLTIP = i18n.translate(
  'xpack.streams.significantEventsDiscovery.streamsView.generateFeaturesTooltip',
  {
    defaultMessage:
      'Runs only feature identification on selected streams using the configured model.',
  }
);

export const GENERATE_QUERIES_TOOLTIP = i18n.translate(
  'xpack.streams.significantEventsDiscovery.streamsView.generateQueriesTooltip',
  {
    defaultMessage: 'Runs only query generation on selected streams using the configured model.',
  }
);

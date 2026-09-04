/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { SIGNIFICANT_EVENT_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';
import { SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import {
  SIGNIFICANT_EVENTS_API_PRIVILEGES,
  SIGNIFICANT_EVENTS_FEATURE_ID,
  SIGNIFICANT_EVENTS_UI_PRIVILEGES,
} from '../common/constants';

/**
 * Registers the Significant Events Kibana feature and its API/UI privileges.
 */
export function registerSignificantEventsFeature(features: FeaturesPluginSetup): void {
  features.registerKibanaFeature({
    id: SIGNIFICANT_EVENTS_FEATURE_ID,
    name: i18n.translate('xpack.significantEvents.featureRegistry.featureName', {
      defaultMessage: 'Significant Events',
    }),
    category: DEFAULT_APP_CATEGORIES.observability,
    app: [SIGNIFICANT_EVENTS_APP_ID],
    privileges: {
      all: {
        app: [SIGNIFICANT_EVENTS_APP_ID],
        aiIndex: { read: [SIGNIFICANT_EVENT_KI_TYPE] },
        savedObject: { all: [], read: [] },
        api: [SIGNIFICANT_EVENTS_API_PRIVILEGES.read, SIGNIFICANT_EVENTS_API_PRIVILEGES.manage],
        ui: [SIGNIFICANT_EVENTS_UI_PRIVILEGES.show, SIGNIFICANT_EVENTS_UI_PRIVILEGES.manage],
      },
      read: {
        app: [SIGNIFICANT_EVENTS_APP_ID],
        aiIndex: { read: [SIGNIFICANT_EVENT_KI_TYPE] },
        savedObject: { all: [], read: [] },
        api: [SIGNIFICANT_EVENTS_API_PRIVILEGES.read],
        ui: [SIGNIFICANT_EVENTS_UI_PRIVILEGES.show],
      },
    },
  });
}

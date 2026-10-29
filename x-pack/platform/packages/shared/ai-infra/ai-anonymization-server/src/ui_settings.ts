/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { aiAnonymizationSettings } from '@kbn/ai-anonymization-common';
import {
  anonymizationSettingsSchema,
  DEFAULT_ANONYMIZATION_SETTINGS,
} from './anonymization_settings';

export function getAnonymizationUiSettings(): Record<string, UiSettingsParams> {
  return {
    [aiAnonymizationSettings]: {
      category: ['general'],
      value: JSON.stringify(DEFAULT_ANONYMIZATION_SETTINGS, null, 2),
      // Managed from the Anonymization page, so it is not listed in Advanced Settings and needs no
      // name or description there. `readonly` removes it from that page, and `readonlyMode: 'ui'`
      // (not 'strict') keeps writes through the settings client and the API working, which the
      // page and `kibana.yml` overrides rely on.
      readonly: true,
      readonlyMode: 'ui',
      schema: anonymizationSettingsSchema,
      type: 'json',
      requiresPageReload: true,
      technicalPreview: true,
    },
  };
}

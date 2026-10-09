/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import { aiAnonymizationSettings } from '@kbn/ai-anonymization-common';
import {
  anonymizationSettingsSchema,
  DEFAULT_ANONYMIZATION_SETTINGS,
} from './anonymization_settings';

export function getAnonymizationUiSettings(): Record<string, UiSettingsParams> {
  return {
    [aiAnonymizationSettings]: {
      category: ['general'],
      name: i18n.translate('xpack.aiAnonymization.settings.label', {
        defaultMessage: 'Anonymization Settings',
      }),
      value: JSON.stringify(DEFAULT_ANONYMIZATION_SETTINGS, null, 2),
      description: i18n.translate('xpack.aiAnonymization.settings.description', {
        defaultMessage: `List of anonymization rules
          <ul>
            <li><strong>type:</strong> "NER" or "RegExp"</li>
            <li><strong>entityClass:</strong> (RegExp type only) eg: EMAIL, URL, IP</li>
            <li><strong>pattern:</strong> (RegExp type only) the regular-expression string to match</li>
            <li><strong>modelId:</strong> (NER type only) ID of the NER (Named Entity Recognition) model to use</li>
            <li><strong>enabled:</strong> boolean flag to turn the rule on or off</li>
            <li><strong>timeoutSeconds:</strong> (NER type only) maximum seconds <em>per inference request</em> before timing out (multiple requests may be issued during a single chat interaction)</li>
          </ul>`,
        values: {
          ul: (chunks) => `<ul>${chunks}</ul>`,
          li: (chunks) => `<li>${chunks}</li>`,
          strong: (chunks) => `<strong>${chunks}</strong>`,
          em: (chunks) => `<em>${chunks}</em>`,
        },
      }),
      schema: anonymizationSettingsSchema,
      type: 'json',
      requiresPageReload: true,
      technicalPreview: true,
    },
  };
}

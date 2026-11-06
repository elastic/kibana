/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { CLOSE_CASE_WHEN_INVESTIGATIONS_CLOSE_SETTING } from '../../common/cases_bridge';

export const registerCaseBridgeUiSettings = (uiSettings: UiSettingsServiceSetup): void => {
  uiSettings.register({
    [CLOSE_CASE_WHEN_INVESTIGATIONS_CLOSE_SETTING]: {
      name: i18n.translate(
        'xpack.agenticInvestigations.settings.closeCaseWhenInvestigationsClose',
        {
          defaultMessage: 'Close the case when all its linked investigations close',
        }
      ),
      description: i18n.translate(
        'xpack.agenticInvestigations.settings.closeCaseWhenInvestigationsCloseDescription',
        {
          defaultMessage:
            'Closing a case always closes its linked investigations. Turn this on to also close a case when the last of its linked investigations closes.',
        }
      ),
      value: false,
      schema: schema.boolean(),
      category: ['securitySolution'],
      requiresPageReload: false,
    },
  });
};

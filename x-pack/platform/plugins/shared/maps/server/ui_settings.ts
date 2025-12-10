/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { i18n } from '@kbn/i18n';
import { SPACE_PROJECT_ROUTING_SETTING_ID } from '../common/constants';

export const registerUISettings = ({ uiSettings }: { uiSettings: UiSettingsServiceSetup }) => {
  uiSettings.register({
    [SPACE_PROJECT_ROUTING_SETTING_ID]: {
      description: i18n.translate('xpack.maps.uiSettings.spaceProjectRouting.description', {
        defaultMessage: 'Enable space project routing',
      }),
      name: i18n.translate('xpack.maps.uiSettings.spaceProjectRouting.name', {
        defaultMessage: 'Space Project Routing',
      }),
      schema: schema.boolean(),
      type: 'boolean',
      value: false,
      readonly: false,
      requiresPageReload: true,
      category: ['general'],
    },
  });
};


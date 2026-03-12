/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core/server';
import {
  RUNNING_QUERIES_MIN_RUNNING_TIME_DEFAULT_MS,
  RUNNING_QUERIES_MIN_RUNNING_TIME_SETTING,
} from '../common/constants';

export const uiSettings: Record<string, UiSettingsParams> = {
  [RUNNING_QUERIES_MIN_RUNNING_TIME_SETTING]: {
    name: i18n.translate('xpack.runningQueries.uiSettings.minRunningTime.name', {
      defaultMessage: 'Minimum running time',
    }),
    description: i18n.translate('xpack.runningQueries.uiSettings.minRunningTime.description', {
      defaultMessage:
        'Queries running for less than this duration (in milliseconds) will not appear in the Running Queries view. Increase this value to reduce noise from fast-completing queries.',
    }),
    value: RUNNING_QUERIES_MIN_RUNNING_TIME_DEFAULT_MS,
    schema: schema.number({ min: 0 }),
    category: ['search'],
    type: 'number',
  },
};

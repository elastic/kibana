/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const googleCalendarDataSource: DataSource = {
  id: 'google_calendar',
  name: 'Google Calendar',
  description: i18n.translate('xpack.dataSources.googleCalendar.description', {
    defaultMessage: 'Connect to Google Calendar to search and access events and calendars.',
  }),
  iconType: '.google_calendar',

  stackConnector: {
    type: '.google_calendar',
    config: {},
  },

  workflows: {
    directory: __dirname + '/workflows',
  },
};

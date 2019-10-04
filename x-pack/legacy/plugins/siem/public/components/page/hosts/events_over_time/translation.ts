/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EVENT_COUNT_FREQUENCY_BY_ACTION = i18n.translate(
  'xpack.siem.eventsOverTime.eventCountFrequencyByActionTitle',
  {
    defaultMessage: 'Event count by action',
  }
);

export const LOADING_EVENTS_OVER_TIME = i18n.translate(
  'xpack.siem.eventsOverTime.loadingEventsOverTimeTitle',
  {
    defaultMessage: 'Loading events histogram',
  }
);

export const SHOWING = i18n.translate('xpack.siem.eventsOverTime.showing', {
  defaultMessage: 'Showing',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.eventsOverTime.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {event} other {events}}`,
  });

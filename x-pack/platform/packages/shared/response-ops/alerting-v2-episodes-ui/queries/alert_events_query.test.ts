/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '../constants';
import { buildAlertEventsBaseQuery } from './alert_events_query';

describe('buildAlertEventsBaseQuery', () => {
  it('selects from rule-events and filters to alert-type rows', () => {
    const queryString = buildAlertEventsBaseQuery().print('basic');
    expect(queryString).toContain(`FROM ${ALERT_EVENTS_DATA_STREAM}`);
    expect(queryString).toContain('type == "alert"');
  });
});

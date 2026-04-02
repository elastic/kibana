/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTIONS_DATA_STREAM } from '../constants';
import { buildActionsBaseQuery } from './actions_query';

describe('buildActionsBaseQuery', () => {
  it('selects from the alert-actions data stream', () => {
    const queryString = buildActionsBaseQuery().print('basic');
    expect(queryString).toContain(`FROM ${ALERT_ACTIONS_DATA_STREAM}`);
  });
});

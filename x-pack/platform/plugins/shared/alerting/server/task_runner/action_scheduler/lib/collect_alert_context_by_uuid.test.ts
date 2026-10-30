/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectAlertContextByUuid } from './collect_alert_context_by_uuid';
import { generateAlert, generateRecoveredAlert } from '../test_fixtures';

describe('collectAlertContextByUuid', () => {
  it('returns an empty object when no alerts are provided', () => {
    expect(collectAlertContextByUuid()).toEqual({});
    expect(collectAlertContextByUuid({}, {})).toEqual({});
  });

  it('omits alerts that have no context', () => {
    const active = generateAlert({ id: 1 });
    expect(collectAlertContextByUuid(active)).toEqual({});
  });

  it('keys context by uuid and instance id', () => {
    const context = { message: 'cpu high', value: 90 };
    const active = generateAlert({ id: 1, context });
    const alert = active[1];

    expect(collectAlertContextByUuid(active)).toEqual({
      [alert.getUuid()]: context,
      [alert.getId()]: context,
    });
  });

  it('includes recovered alerts', () => {
    const context = { message: 'recovered' };
    const recoveredBase = generateRecoveredAlert({ id: 3 });
    recoveredBase[3].setContext(context);

    expect(collectAlertContextByUuid(undefined, recoveredBase)).toEqual({
      [recoveredBase[3].getUuid()]: context,
      [recoveredBase[3].getId()]: context,
    });
  });
});

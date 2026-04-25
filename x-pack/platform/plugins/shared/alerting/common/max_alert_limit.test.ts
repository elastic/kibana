/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaxAlertLimit } from './max_alert_limit';

describe('getMaxAlertLimit', () => {
  it('should return allowed max alerts if maxAlerts param is larger', () => {
    const alertLimit = getMaxAlertLimit(10000);
    expect(alertLimit).toEqual(5000);
  });

  it('should return maxAlerts param if maxAlerts is smaller', () => {
    const alertLimit = getMaxAlertLimit(3000);
    expect(alertLimit).toEqual(3000);
  });
});

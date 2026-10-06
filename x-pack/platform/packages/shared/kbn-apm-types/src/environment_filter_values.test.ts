/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
  getAlertsEnvironmentKuery,
} from './environment_filter_values';

describe('getAlertsEnvironmentKuery', () => {
  it('returns undefined for ENVIRONMENT_ALL', () => {
    expect(getAlertsEnvironmentKuery(ENVIRONMENT_ALL.value)).toBeUndefined();
  });

  it('returns undefined for an empty environment', () => {
    expect(getAlertsEnvironmentKuery('')).toBeUndefined();
  });

  it('matches sentinel or missing field for ENVIRONMENT_NOT_DEFINED', () => {
    expect(getAlertsEnvironmentKuery(ENVIRONMENT_NOT_DEFINED.value)).toBe(
      '(service.environment: "ENVIRONMENT_NOT_DEFINED" OR NOT service.environment: *)'
    );
  });

  it('returns a quoted field match for a concrete environment', () => {
    expect(getAlertsEnvironmentKuery('production')).toBe('service.environment: "production"');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  __resetRruleValidationRejectionCount,
  getRruleValidationRejectionCount,
  recordRruleValidationRejection,
} from './rrule_telemetry';

describe('rrule telemetry counter', () => {
  beforeEach(() => {
    __resetRruleValidationRejectionCount();
  });

  it('starts at 0', () => {
    expect(getRruleValidationRejectionCount()).toBe(0);
  });

  it('increments on each rejection', () => {
    recordRruleValidationRejection();
    recordRruleValidationRejection();
    recordRruleValidationRejection();
    expect(getRruleValidationRejectionCount()).toBe(3);
  });
});

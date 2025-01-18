/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapEsHealthStatus2TransformHealthStatus } from './constants';

describe('mapEsHealthStatus2TransformHealthStatus', () => {
  it('maps estypes HealthStatus to TransformHealthStatus', () => {
    expect(mapEsHealthStatus2TransformHealthStatus(undefined)).toBe('unknown');
    expect(mapEsHealthStatus2TransformHealthStatus('green')).toBe('green');
    expect(mapEsHealthStatus2TransformHealthStatus('GREEN')).toBe('green');
    expect(mapEsHealthStatus2TransformHealthStatus('yellow')).toBe('yellow');
    expect(mapEsHealthStatus2TransformHealthStatus('YELLOW')).toBe('yellow');
    expect(mapEsHealthStatus2TransformHealthStatus('red')).toBe('red');
    expect(mapEsHealthStatus2TransformHealthStatus('RED')).toBe('red');
  });
});

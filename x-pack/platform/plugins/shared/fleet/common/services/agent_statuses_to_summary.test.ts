/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentStatusesToSummary } from './agent_statuses_to_summary';

describe('agentStatusesToSummary', () => {
  it('should return the correct summary', () => {
    expect(
      agentStatusesToSummary({
        online: 1,
        error: 2,
        degraded: 3,
        inactive: 4,
        offline: 5,
        updating: 6,
        enrolling: 7,
        unenrolling: 8,
        unenrolled: 9,
        orphaned: 0,
        uninstalled: 0,
      })
    ).toEqual({
      healthy: 1,
      unhealthy: 5,
      orphaned: 0,
      inactive: 4,
      offline: 5,
      updating: 21,
      unenrolled: 9,
      uninstalled: 0,
    });
  });
});

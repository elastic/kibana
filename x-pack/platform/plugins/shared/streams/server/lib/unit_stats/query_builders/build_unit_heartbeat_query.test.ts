/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_HEARTBEAT_LOOKBACK_MS, UNIT_METRICS_STREAM } from '../constants';
import { buildUnitHeartbeatQuery } from './build_unit_heartbeat_query';

const now = new Date('2026-11-25T12:00:00.000Z');
const lookbackStart = (end: Date) => new Date(end.getTime() - UNIT_HEARTBEAT_LOOKBACK_MS);

describe('buildUnitHeartbeatQuery', () => {
  it('takes the newest timestamp of the uptime documents of the unit within the lookback', () => {
    expect(buildUnitHeartbeatQuery({ unitId: 'default', now }).print('basic')).toBe(
      `SET unmapped_fields = "nullify"; FROM ${UNIT_METRICS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${lookbackStart(
        now
      ).toISOString()}" AND @timestamp < "${now.toISOString()}" | WHERE metrics.streams.unit.uptime IS NOT NULL | STATS last_seen = MAX(@timestamp)`
    );
  });

  it('reads the lookback from the time it is given, and has no config hash', () => {
    const later = new Date('2026-11-25T18:30:00.000Z');
    const query = buildUnitHeartbeatQuery({ unitId: 'default', now: later }).print('basic');

    expect(query).toContain(`@timestamp >= "${lookbackStart(later).toISOString()}"`);
    expect(query).toContain(`@timestamp < "${later.toISOString()}"`);
    expect(query).not.toContain('config.hash');
  });
});

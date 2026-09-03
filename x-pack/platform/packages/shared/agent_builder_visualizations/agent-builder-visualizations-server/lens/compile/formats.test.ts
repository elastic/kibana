/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatFromColumnName, formatFromUnit, resolveColumnFormat } from './formats';

describe('formats', () => {
  it('maps each intent unit to a legal Lens format', () => {
    expect(formatFromUnit('percent')).toEqual({ type: 'percent' });
    expect(formatFromUnit('bytes')).toEqual({ type: 'bytes' });
    expect(formatFromUnit('bits')).toEqual({ type: 'bits' });
    expect(formatFromUnit('ms')).toEqual({ type: 'duration', from: 'ms', to: 'auto-approximate' });
    expect(formatFromUnit('s')).toEqual({ type: 'duration', from: 's', to: 'auto-approximate' });
    expect(formatFromUnit('us')).toEqual({ type: 'duration', from: 'us', to: 'auto-approximate' });
    expect(formatFromUnit('ns')).toEqual({ type: 'duration', from: 'ns', to: 'auto-approximate' });
  });

  it('guesses bytes and bits from conservative column names', () => {
    expect(formatFromColumnName('memory_bytes')).toEqual({ type: 'bytes' });
    expect(formatFromColumnName('disk_usage')).toEqual({ type: 'bytes' });
    expect(formatFromColumnName('bits')).toEqual({ type: 'bits' });
    expect(formatFromColumnName('network_rate')).toEqual({ type: 'bits' });
    expect(formatFromColumnName('throughput')).toEqual({ type: 'bits' });
  });

  it('never guesses percent or duration from a name', () => {
    expect(formatFromColumnName('cpu_percent')).toBeUndefined();
    expect(formatFromColumnName('duration_ms')).toBeUndefined();
    expect(formatFromColumnName('latency')).toBeUndefined();
  });

  it('prefers an explicit unit over the name regex', () => {
    expect(resolveColumnFormat('memory_bytes', { memory_bytes: 'percent' })).toEqual({
      type: 'percent',
    });
  });
});

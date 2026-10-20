/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_METRICS_STREAM } from '../constants';
import { buildStreamProbeQuery } from './build_stream_probe_query';

describe('buildStreamProbeQuery', () => {
  it('reads no rows from the stream by wildcard', () => {
    expect(buildStreamProbeQuery().print('basic')).toBe(`FROM ${UNIT_METRICS_STREAM}* | LIMIT 0`);
  });
});

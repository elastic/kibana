/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNALS_INDEX_NAME } from '../../common/http_api/signals';
import { signalsSchema } from './storage';

interface MappingProp {
  type: string;
  ignore_above?: number;
  properties?: Record<string, MappingProp>;
}

const props = signalsSchema.properties as unknown as Record<string, MappingProp>;

describe('signals storage', () => {
  it('uses a global AI index name following the ai-index-idx- convention', () => {
    expect(SIGNALS_INDEX_NAME).toBe('ai-index-idx-signals');
    expect(SIGNALS_INDEX_NAME.startsWith('ai-index-idx-')).toBe(true);
  });

  it('maps `data` as flattened with ignore_above (subfields queryable; long free-text skipped)', () => {
    expect(props.data.type).toBe('flattened');
    expect(props.data.ignore_above).toBe(1024);
  });

  it('maps `tags` as a keyword array', () => {
    expect(props.tags.type).toBe('keyword');
  });

  it('maps `space_id` as a keyword for space isolation filtering', () => {
    expect(props.space_id.type).toBe('keyword');
  });

  it('types the envelope fields', () => {
    expect(props.signal_id.type).toBe('keyword');
    expect(props['@timestamp'].type).toBe('date');
    expect(props.trace_ids.type).toBe('keyword');
    expect(props.signal_type.type).toBe('keyword');
  });
});

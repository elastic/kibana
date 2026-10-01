/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNAL_INDEX_PREFIX, buildSignalsIndexName } from '../../common/http_api/signals';
import { signalsSchema } from './storage';

interface MappingProp {
  type: string;
  ignore_above?: number;
  properties?: Record<string, MappingProp>;
}

const props = signalsSchema.properties as unknown as Record<string, MappingProp>;

describe('signals storage', () => {
  it('names a per-space user index under the prefix (not a hidden system index)', () => {
    expect(SIGNAL_INDEX_PREFIX).toBe('context-engine-signals-');
    expect(buildSignalsIndexName('default')).toBe('context-engine-signals-default');
    expect(buildSignalsIndexName('my-space')).toBe('context-engine-signals-my-space');
    expect(buildSignalsIndexName('default').startsWith('.')).toBe(false);
  });

  it('maps `data` as flattened with ignore_above (subfields queryable; long free-text skipped)', () => {
    expect(props.data.type).toBe('flattened');
    expect(props.data.ignore_above).toBe(1024);
  });

  it('maps `tags` as a keyword array', () => {
    expect(props.tags.type).toBe('keyword');
  });

  it('types the envelope fields', () => {
    expect(props.signal_id.type).toBe('keyword');
    expect(props['@timestamp'].type).toBe('date');
    expect(props.trace_ids.type).toBe('keyword');
    expect(props.signal_type.type).toBe('keyword');
  });
});

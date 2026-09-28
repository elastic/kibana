/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { applyManagedLifecycle } from './apply_managed_lifecycle';

const index = (value: string): AiIndexDest => ({ type: 'index', value });
const dataStream = (value: string): AiIndexDest => ({ type: 'data_stream', value });

const LIFECYCLE =
  'WHERE governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active" | WHERE expires_at IS NULL OR expires_at > NOW() | DROP governance.*';

const flat = (query: string) => query.replace(/\s+/g, ' ');

describe('applyManagedLifecycle', () => {
  const managed = [index('.ai-index-idx-elastic-index')];

  it('inserts the lifecycle pipeline after a managed FROM', () => {
    const result = applyManagedLifecycle(
      'FROM .ai-index-idx-elastic-index METADATA _id, _index, _score | KEEP title',
      managed
    );

    expect(flat(result)).toBe(
      `FROM .ai-index-idx-elastic-index METADATA _id, _index, _score | ${LIFECYCLE} | KEEP title`
    );
    expect(Parser.parse(result).errors).toEqual([]);
  });

  it('inserts before FORK', () => {
    const result = applyManagedLifecycle(
      'FROM .ai-index-idx-elastic-index | FORK (WHERE a | LIMIT 5) (WHERE b | LIMIT 5) | FUSE',
      managed
    );

    expect(result.indexOf('governance.lifecycle.status')).toBeLessThan(result.indexOf('FORK'));
    expect(Parser.parse(result).errors).toEqual([]);
  });

  it('matches a wildcard source and a multi-target FROM', () => {
    expect(flat(applyManagedLifecycle('FROM .ai-index-*', managed))).toContain(LIFECYCLE);
    expect(
      flat(applyManagedLifecycle('FROM v-ai-index-a, .ai-index-idx-elastic-index', managed))
    ).toContain(LIFECYCLE);
  });

  it('matches a managed dest pattern or list', () => {
    expect(
      flat(applyManagedLifecycle('FROM .ai-index-idx-x', [index('.ai-index-idx-*')]))
    ).toContain(LIFECYCLE);
    expect(flat(applyManagedLifecycle('FROM idx-b', [index('idx-a,idx-b')]))).toContain(LIFECYCLE);
  });

  it('collapses to the latest revision per id for a data stream', () => {
    const result = flat(
      applyManagedLifecycle('FROM .ai-index-ds-elastic | KEEP title', [
        dataStream('.ai-index-ds-elastic'),
      ])
    );

    expect(result).toBe(
      `FROM .ai-index-ds-elastic | EVAL id = COALESCE(id, _id) | INLINE STATS latest = MAX(@timestamp) BY id | WHERE @timestamp == latest | INLINE STATS latest_doc = MAX(_id) BY id | WHERE _id == latest_doc | DROP latest, latest_doc | ${LIFECYCLE} | KEEP title`
    );
    expect(Parser.parse(result).errors).toEqual([]);
  });

  it('leaves queries on views and unmanaged indices untouched', () => {
    expect(applyManagedLifecycle('FROM v-ai-index-a | KEEP title', managed)).toBe(
      'FROM v-ai-index-a | KEEP title'
    );
    expect(applyManagedLifecycle('FROM ai-index-idx-a', [])).toBe('FROM ai-index-idx-a');
  });

  it('leaves a query the parser rejects untouched', () => {
    expect(applyManagedLifecycle('FROM .ai-index-idx-elastic-index | WHERE', managed)).toBe(
      'FROM .ai-index-idx-elastic-index | WHERE'
    );
  });
});

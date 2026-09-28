/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { applyKiLifecycle } from './ki_lifecycle';

const index = (value: string): AiIndexDest => ({ type: 'index', value });
const dataStream = (value: string): AiIndexDest => ({ type: 'data_stream', value });

const LIFECYCLE =
  'WHERE governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active" | WHERE expires_at IS NULL OR expires_at > NOW() | DROP governance.*';
const LATEST_REVISION =
  'EVAL id = COALESCE(id, _id) | INLINE STATS latest = MAX(@timestamp) BY id | WHERE @timestamp == latest | INLINE STATS latest_doc = MAX(_id) BY id | WHERE _id == latest_doc | DROP latest, latest_doc';

const flat = (query: string) => query.replace(/\s+/g, ' ');

describe('applyKiLifecycle', () => {
  const dests = [index('ai-index-idx-support')];

  it('inserts the lifecycle filters after a registered FROM', () => {
    const result = applyKiLifecycle(
      'FROM ai-index-idx-support METADATA _id, _index, _score | KEEP title',
      dests
    );

    expect(flat(result)).toBe(
      `FROM ai-index-idx-support METADATA _id, _index, _score | ${LIFECYCLE} | KEEP title`
    );
    expect(Parser.parse(result).errors).toEqual([]);
  });

  it('inserts before FORK', () => {
    const result = applyKiLifecycle(
      'FROM ai-index-idx-support | FORK (WHERE a | LIMIT 5) (WHERE b | LIMIT 5) | FUSE',
      dests
    );

    expect(result.indexOf('governance.lifecycle.status')).toBeLessThan(result.indexOf('FORK'));
    expect(Parser.parse(result).errors).toEqual([]);
  });

  it('matches a wildcard source and a multi-target FROM', () => {
    expect(flat(applyKiLifecycle('FROM ai-index-*', dests))).toContain(LIFECYCLE);
    expect(flat(applyKiLifecycle('FROM other-idx, ai-index-idx-support', dests))).toContain(
      LIFECYCLE
    );
  });

  it('matches a dest pattern or list', () => {
    expect(flat(applyKiLifecycle('FROM ai-index-idx-x', [index('ai-index-idx-*')]))).toContain(
      LIFECYCLE
    );
    expect(flat(applyKiLifecycle('FROM idx-b', [index('idx-a,idx-b')]))).toContain(LIFECYCLE);
  });

  it('collapses to the latest revision per id for a data stream', () => {
    const result = flat(
      applyKiLifecycle('FROM ai-index-ds-support METADATA _id | KEEP title', [
        dataStream('ai-index-ds-support'),
      ])
    );

    expect(result).toBe(
      `FROM ai-index-ds-support METADATA _id | ${LATEST_REVISION} | ${LIFECYCLE} | KEEP title`
    );
    expect(Parser.parse(result).errors).toEqual([]);
  });

  it('adds the _id metadata the revision collapse needs', () => {
    expect(
      flat(
        applyKiLifecycle('FROM ai-index-ds-support | KEEP title', [
          dataStream('ai-index-ds-support'),
        ])
      )
    ).toMatch(/^FROM ai-index-ds-support METADATA _id \| EVAL id = COALESCE\(id, _id\)/);
    expect(
      flat(
        applyKiLifecycle('FROM ai-index-ds-support METADATA _score, _id | KEEP title', [
          dataStream('ai-index-ds-support'),
        ])
      )
    ).toMatch(/^FROM ai-index-ds-support METADATA _score, _id \| EVAL/);
  });

  it('leaves lifecycle to a query that names a lifecycle field', () => {
    const own = 'FROM ai-index-idx-support | WHERE governance.lifecycle.status == "deleted"';
    expect(applyKiLifecycle(own, dests)).toBe(own);

    const expiry = 'FROM ai-index-idx-support | WHERE expires_at < NOW() | KEEP title';
    expect(applyKiLifecycle(expiry, dests)).toBe(expiry);

    const provenance =
      'FROM ai-index-idx-support | KEEP title, governance.provenance.created_by.uri';
    expect(applyKiLifecycle(provenance, dests)).toBe(provenance);
  });

  it('still collapses revisions for a data stream query that names a lifecycle field', () => {
    const result = flat(
      applyKiLifecycle(
        'FROM ai-index-ds-support | WHERE governance.lifecycle.status == "deleted" | KEEP id',
        [dataStream('ai-index-ds-support')]
      )
    );

    expect(result).toBe(
      `FROM ai-index-ds-support METADATA _id | ${LATEST_REVISION} | WHERE governance.lifecycle.status == "deleted" | KEEP id`
    );
  });

  it('leaves queries on unregistered indices untouched', () => {
    expect(applyKiLifecycle('FROM ai-index-idx-other | KEEP title', dests)).toBe(
      'FROM ai-index-idx-other | KEEP title'
    );
    expect(applyKiLifecycle('FROM ai-index-idx-support', [])).toBe('FROM ai-index-idx-support');
  });

  it('leaves a query the parser rejects untouched', () => {
    expect(applyKiLifecycle('FROM ai-index-idx-support | WHERE', dests)).toBe(
      'FROM ai-index-idx-support | WHERE'
    );
  });
});

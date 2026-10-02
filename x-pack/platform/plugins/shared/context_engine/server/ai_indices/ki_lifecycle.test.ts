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

const STATUS =
  'WHERE governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active"';
const EXPIRY = 'WHERE expires_at IS NULL OR expires_at > NOW()';
const DROP = 'DROP governance.*';
const LIFECYCLE = `${STATUS} | ${EXPIRY} | ${DROP}`;
const latestRevision = (...streams: string[]) =>
  [
    'EVAL id = COALESCE(id, _id)',
    'EVAL ki_revision_time = COALESCE(@timestamp, TO_DATETIME("1970-01-01T00:00:00Z"))',
    `EVAL ki_target = CASE(${streams
      .map((stream) => `_index LIKE ".ds-${stream}-????.??.??-*", "${stream}"`)
      .join(', ')}, _index)`,
    'INLINE STATS latest = MAX(ki_revision_time) BY ki_target, id',
    'WHERE ki_revision_time == latest',
    'INLINE STATS latest_doc = MAX(_id) BY ki_target, id',
    'WHERE _id == latest_doc',
    'DROP latest, latest_doc, ki_revision_time, ki_target',
  ].join(' | ');

const flat = (query: string) => query.replace(/\s+/g, ' ').replace(/\( /g, '(');

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

  it('collapses to the latest revision per target and id for a data stream', () => {
    const result = flat(
      applyKiLifecycle('FROM ai-index-ds-support METADATA _id, _index | KEEP title', [
        dataStream('ai-index-ds-support'),
      ])
    );

    expect(result).toBe(
      `FROM ai-index-ds-support METADATA _id, _index | ${latestRevision(
        'ai-index-ds-support'
      )} | ${LIFECYCLE} | KEEP title`
    );
    expect(Parser.parse(result).errors).toEqual([]);
  });

  it('keys the collapse by every matched data stream when several targets are read', () => {
    const result = flat(
      applyKiLifecycle('FROM ai-index-* | KEEP id', [
        dataStream('ai-index-ds-a'),
        index('ai-index-idx-b'),
        dataStream('ai-index-ds-c'),
      ])
    );

    expect(result).toContain(latestRevision('ai-index-ds-a', 'ai-index-ds-c'));
    expect(Parser.parse(result).errors).toEqual([]);
  });

  it('adds the metadata the revision collapse needs', () => {
    expect(
      flat(
        applyKiLifecycle('FROM ai-index-ds-support | KEEP title', [
          dataStream('ai-index-ds-support'),
        ])
      )
    ).toMatch(/^FROM ai-index-ds-support METADATA _id, _index \| EVAL id = COALESCE\(id, _id\)/);
    expect(
      flat(
        applyKiLifecycle('FROM ai-index-ds-support METADATA _score, _id | KEEP title', [
          dataStream('ai-index-ds-support'),
        ])
      )
    ).toMatch(/^FROM ai-index-ds-support METADATA _score, _id, _index \| EVAL/);
  });

  it('switches off only the default a named lifecycle field replaces', () => {
    expect(
      flat(
        applyKiLifecycle(
          'FROM ai-index-idx-support | WHERE governance.lifecycle.status == "deleted"',
          dests
        )
      )
    ).toBe(
      `FROM ai-index-idx-support | ${EXPIRY} | WHERE governance.lifecycle.status == "deleted"`
    );

    expect(
      flat(
        applyKiLifecycle('FROM ai-index-idx-support | WHERE expires_at < NOW() | KEEP title', dests)
      )
    ).toBe(
      `FROM ai-index-idx-support | ${STATUS} | ${DROP} | WHERE expires_at < NOW() | KEEP title`
    );

    expect(
      flat(
        applyKiLifecycle(
          'FROM ai-index-idx-support | KEEP title, governance.provenance.created_by.uri',
          dests
        )
      )
    ).toBe(
      `FROM ai-index-idx-support | ${STATUS} | ${EXPIRY} | KEEP title, governance.provenance.created_by.uri`
    );
  });

  it('keeps the filters when a lifecycle field is only displayed, sorted or computed on', () => {
    expect(
      flat(applyKiLifecycle('FROM ai-index-idx-support | KEEP title, expires_at', dests))
    ).toBe(`FROM ai-index-idx-support | ${LIFECYCLE} | KEEP title, expires_at`);

    expect(
      flat(
        applyKiLifecycle(
          'FROM ai-index-idx-support | KEEP title, governance.lifecycle.status',
          dests
        )
      )
    ).toBe(
      `FROM ai-index-idx-support | ${STATUS} | ${EXPIRY} | KEEP title, governance.lifecycle.status`
    );

    expect(flat(applyKiLifecycle('FROM ai-index-idx-support | SORT expires_at', dests))).toBe(
      `FROM ai-index-idx-support | ${LIFECYCLE} | SORT expires_at`
    );

    expect(
      flat(
        applyKiLifecycle(
          'FROM ai-index-idx-support | STATS count = COUNT(*) BY governance.lifecycle.status',
          dests
        )
      )
    ).toBe(
      `FROM ai-index-idx-support | ${STATUS} | ${EXPIRY} | STATS count = COUNT(*) BY governance.lifecycle.status`
    );
  });

  it('switches off a default for a WHERE inside a FORK branch', () => {
    const result = applyKiLifecycle(
      'FROM ai-index-idx-support | FORK (WHERE expires_at < NOW()) (WHERE title == "x")',
      dests
    );

    expect(flat(result)).toContain(STATUS);
    expect(flat(result)).not.toContain(EXPIRY);
    expect(Parser.parse(result).errors).toEqual([]);
  });

  it('still collapses revisions for a data stream query that names every lifecycle field', () => {
    const own =
      'FROM ai-index-ds-support | WHERE governance.lifecycle.status == "deleted" AND expires_at IS NULL | KEEP id';
    const result = flat(applyKiLifecycle(own, [dataStream('ai-index-ds-support')]));

    expect(result).toBe(
      `FROM ai-index-ds-support METADATA _id, _index | ${latestRevision(
        'ai-index-ds-support'
      )} | WHERE governance.lifecycle.status == "deleted" AND expires_at IS NULL | KEEP id`
    );
  });

  it('leaves an index query that names every lifecycle field untouched', () => {
    const own =
      'FROM ai-index-idx-support | WHERE governance.lifecycle.status == "deleted" AND expires_at IS NULL';
    expect(applyKiLifecycle(own, dests)).toBe(own);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { planDeduplication } from './deduplication_query';

const METADATA = 'METADATA _id, _index, _version';
const ELIGIBLE = { eligible: true, mvExpandFields: [] };
const NOT_ELIGIBLE = { eligible: false, mvExpandFields: [] };

describe('planDeduplication', () => {
  describe('eligible queries', () => {
    it.each([
      ['a bare FROM declaring the identity', `FROM logs-* ${METADATA}`],
      ['downstream commands', `FROM logs-* ${METADATA} | WHERE x > 5 | LIMIT 10`],
      ['the identity declared in any order', 'FROM logs-* METADATA _version, _id, _index'],
      ['extra metadata fields', 'FROM logs-* METADATA _id, _index, _version, _score'],
      [
        'a KEEP that lists the identity',
        `FROM logs-* ${METADATA} | KEEP host.name, _id, _index, _version`,
      ],
      ['a wildcard KEEP', `FROM logs-* ${METADATA} | KEEP _*, host.name`],
      ['an EVAL that only reads a metadata field', `FROM logs-* ${METADATA} | EVAL doc = _id`],
      ['a non-wildcard DROP of an unrelated column', `FROM logs-* ${METADATA} | DROP message`],
      [
        'an ENRICH that writes unrelated columns',
        `FROM logs-* ${METADATA} | ENRICH policy ON user_id WITH user_name = name`,
      ],
      [
        'a CHANGE_POINT whose output columns are unrelated',
        `FROM logs-* ${METADATA} | CHANGE_POINT value ON ts AS cp_type, cp_pvalue`,
      ],
      [
        'a DISSECT pattern that only resembles a metadata column',
        `FROM logs-* ${METADATA} | DISSECT message "%{message_id} %{host._id}"`,
      ],
      [
        'a GROK pattern naming unrelated columns',
        `FROM logs-* ${METADATA} | GROK message "%{IP:client_ip}"`,
      ],
      ['a LOOKUP JOIN', `FROM logs-* ${METADATA} | LOOKUP JOIN threats ON host.name`],
    ])('is eligible with %s', (_name, query) => {
      expect(planDeduplication(query)).toEqual(ELIGIBLE);
    });
  });

  describe('MV_EXPAND', () => {
    it('records the expanded columns in pipeline order', () => {
      expect(
        planDeduplication(
          `FROM logs-* ${METADATA} | MV_EXPAND host.ip | WHERE x > 1 | MV_EXPAND tags`
        )
      ).toEqual({ eligible: true, mvExpandFields: ['host.ip', 'tags'] });
    });

    it('stays eligible when the expanded column is created by an EVAL before the MV_EXPAND', () => {
      expect(
        planDeduplication(
          `FROM logs-* ${METADATA} | EVAL parts = SPLIT(message, ",") | MV_EXPAND parts`
        )
      ).toEqual({ eligible: true, mvExpandFields: ['parts'] });
    });

    it.each([
      ['RENAME', `FROM logs-* ${METADATA} | MV_EXPAND tags | RENAME tags AS tag`],
      ['DROP', `FROM logs-* ${METADATA} | MV_EXPAND tags | DROP tags`],
      ['EVAL assignment', `FROM logs-* ${METADATA} | MV_EXPAND tags | EVAL tags = TO_UPPER(tags)`],
      ['DISSECT', `FROM logs-* ${METADATA} | MV_EXPAND tags | DISSECT message "%{tags}"`],
    ])('is not eligible when the expanded column is later changed by %s', (_name, query) => {
      expect(planDeduplication(query)).toEqual(NOT_ELIGIBLE);
    });
  });

  describe('queries that do not declare the identity', () => {
    it.each([
      ['no METADATA clause', 'FROM logs-* | WHERE x > 5'],
      ['only _id', 'FROM logs-* METADATA _id | WHERE x > 5'],
      ['_id and _index but not _version', 'FROM logs-* METADATA _id, _index'],
    ])('is not eligible with %s', (_name, query) => {
      expect(planDeduplication(query)).toEqual(NOT_ELIGIBLE);
    });
  });

  describe('queries whose rows are no longer source documents', () => {
    it.each([
      ['STATS', `FROM metrics-* ${METADATA} | STATS avg(cpu) BY host.name | WHERE avg(cpu) > 0.9`],
      [
        'STATS grouped by the metadata fields',
        `FROM logs-* ${METADATA} | STATS c = COUNT(*) BY _id, _index, _version`,
      ],
      ['ROW source', 'ROW x = 1 | WHERE x > 0'],
      ['TS source', 'TS metrics-* | WHERE cpu > 0.9'],
      ['DROP _id', `FROM logs-* ${METADATA} | DROP _id`],
      ['wildcard DROP', `FROM logs-* ${METADATA} | DROP labels.*`],
      ['RENAME _id AS …', `FROM logs-* ${METADATA} | RENAME _id AS doc_id`],
      ['RENAME … = _id', `FROM logs-* ${METADATA} | RENAME doc_id = _id`],
      ['RENAME overwriting _id', `FROM logs-* ${METADATA} | RENAME host.name AS _id`],
      ['EVAL _version = …', `FROM logs-* ${METADATA} | EVAL _version = 1`],
      ['EVAL _id = …', `FROM logs-* ${METADATA} | EVAL _id = "fixed"`],
      ['INLINE STATS', `FROM logs-* ${METADATA} | INLINE STATS c = COUNT(*) BY host.name`],
      ['INLINESTATS', `FROM logs-* ${METADATA} | INLINESTATS c = COUNT(*) BY host.name`],
      [
        'a FORK whose branch reassigns _id',
        `FROM logs-* ${METADATA} | FORK (EVAL _id = "fixed") (WHERE x > 1)`,
      ],
      [
        'a FORK that leaves the identity alone',
        `FROM logs-* ${METADATA} | FORK (WHERE x > 1) (WHERE y > 1)`,
      ],
      [
        'ENRICH … WITH _id = …',
        `FROM logs-* ${METADATA} | ENRICH policy ON user_id WITH _id = user_id`,
      ],
      [
        'COMPLETION writing _index',
        `FROM logs-* ${METADATA} | COMPLETION _index = "prompt" WITH { "inference_id": "x" }`,
      ],
      [
        'RERANK writing _version',
        `FROM logs-* ${METADATA} | RERANK _version = "q" ON message WITH { "inference_id": "x" }`,
      ],
      [
        'CHANGE_POINT … AS _id',
        `FROM logs-* ${METADATA} | CHANGE_POINT value ON ts AS _id, pvalue`,
      ],
      [
        'a DISSECT pattern naming _id',
        `FROM logs-* ${METADATA} | DISSECT message "%{_id} %{rest}"`,
      ],
      [
        'a DISSECT pattern naming _id with modifiers',
        `FROM logs-* ${METADATA} | DISSECT message "%{+_id->} %{rest}"`,
      ],
      ['a GROK pattern naming _id', `FROM logs-* ${METADATA} | GROK message "%{WORD:_id}"`],
      [
        'a typed GROK pattern naming _version',
        `FROM logs-* ${METADATA} | GROK message "%{NUMBER:_version:int}"`,
      ],
      ['a KEEP that omits the identity', `FROM logs-* ${METADATA} | KEEP host.name, message`],
      [
        'a KEEP that lists only part of the identity',
        `FROM logs-* ${METADATA} | KEEP _id, host.name`,
      ],
      [
        'a later KEEP that omits the identity',
        `FROM logs-* ${METADATA} | KEEP _id, _index, _version, a | EVAL b = a | KEEP a, b`,
      ],
    ])('is not eligible with %s', (_name, query) => {
      expect(planDeduplication(query)).toEqual(NOT_ELIGIBLE);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { planDeduplicationQuery } from './deduplication_query';

const METADATA = 'METADATA _id, _index, _version';

describe('planDeduplicationQuery', () => {
  describe('eligible queries', () => {
    it('adds METADATA _id, _index, _version to a bare FROM', () => {
      expect(planDeduplicationQuery('FROM logs-*')).toEqual({
        query: `FROM logs-* ${METADATA}`,
        eligible: true,
        mvExpandFields: [],
      });
    });

    it('injects before downstream commands', () => {
      expect(planDeduplicationQuery('FROM logs-* | WHERE x > 5 | LIMIT 10').query).toBe(
        `FROM logs-* ${METADATA} | WHERE x > 5 | LIMIT 10`
      );
    });

    it('keeps an existing full METADATA clause as-is', () => {
      expect(planDeduplicationQuery(`FROM logs-* ${METADATA}`).query).toBe(
        `FROM logs-* ${METADATA}`
      );
    });

    it('appends only the missing fields to an existing METADATA clause', () => {
      expect(planDeduplicationQuery('FROM logs-* METADATA _index').query).toBe(
        'FROM logs-* METADATA _index, _id, _version'
      );
    });

    it('appends the fields to KEEP so they survive projection', () => {
      expect(planDeduplicationQuery('FROM logs-* | KEEP host.name, message').query).toBe(
        `FROM logs-* ${METADATA} | KEEP host.name, message, _id, _index, _version`
      );
    });

    it('does not duplicate fields already present in KEEP', () => {
      expect(planDeduplicationQuery('FROM logs-* METADATA _id | KEEP _id, host.name').query).toBe(
        `FROM logs-* ${METADATA} | KEEP _id, host.name, _index, _version`
      );
    });

    it('appends the fields to every KEEP in the pipeline', () => {
      expect(planDeduplicationQuery('FROM logs-* | KEEP a, b | EVAL c = a | KEEP a, c').query).toBe(
        `FROM logs-* ${METADATA} | KEEP a, b, _id, _index, _version | EVAL c = a | KEEP a, c, _id, _index, _version`
      );
    });

    it('stays eligible when EVAL only reads a metadata field', () => {
      expect(planDeduplicationQuery('FROM logs-* | EVAL doc = _id | KEEP host.name')).toEqual({
        query: `FROM logs-* ${METADATA} | EVAL doc = _id | KEEP host.name, _id, _index, _version`,
        eligible: true,
        mvExpandFields: [],
      });
    });

    it('stays eligible when a non-wildcard DROP targets an unrelated column', () => {
      expect(planDeduplicationQuery('FROM logs-* | DROP message').eligible).toBe(true);
    });
  });

  describe('MV_EXPAND', () => {
    it('records the expanded columns in pipeline order', () => {
      expect(
        planDeduplicationQuery('FROM logs-* | MV_EXPAND host.ip | WHERE x > 1 | MV_EXPAND tags')
          .mvExpandFields
      ).toEqual(['host.ip', 'tags']);
    });

    it('does not add the expanded column to KEEP (rows that drop it fall back to ES-generated ids)', () => {
      expect(planDeduplicationQuery('FROM logs-* | MV_EXPAND host.ip | KEEP host.name').query).toBe(
        `FROM logs-* ${METADATA} | MV_EXPAND host.ip | KEEP host.name, _id, _index, _version`
      );
    });

    it('keeps a query valid when a KEEP precedes the EVAL that creates the expanded column', () => {
      expect(
        planDeduplicationQuery(
          'FROM logs-* | KEEP message | EVAL parts = SPLIT(message, ",") | MV_EXPAND parts'
        )
      ).toEqual({
        query: `FROM logs-* ${METADATA} | KEEP message, _id, _index, _version | EVAL parts = SPLIT(message, ",") | MV_EXPAND parts`,
        eligible: true,
        mvExpandFields: ['parts'],
      });
    });

    it('stays eligible when the expanded column is created by an EVAL before the MV_EXPAND', () => {
      expect(
        planDeduplicationQuery('FROM logs-* | EVAL parts = SPLIT(message, ",") | MV_EXPAND parts')
      ).toEqual({
        query: `FROM logs-* ${METADATA} | EVAL parts = SPLIT(message, ",") | MV_EXPAND parts`,
        eligible: true,
        mvExpandFields: ['parts'],
      });
    });

    it.each([
      ['RENAME', 'FROM logs-* | MV_EXPAND tags | RENAME tags AS tag | KEEP tag'],
      ['DROP', 'FROM logs-* | MV_EXPAND tags | DROP tags'],
      ['EVAL assignment', 'FROM logs-* | MV_EXPAND tags | EVAL tags = TO_UPPER(tags)'],
    ])('is not eligible when the expanded column is later changed by %s', (_name, query) => {
      expect(planDeduplicationQuery(query)).toEqual({
        query,
        eligible: false,
        mvExpandFields: [],
      });
    });
  });

  describe('ineligible queries are returned untouched', () => {
    it.each([
      ['STATS', 'FROM metrics-*\n| STATS avg(cpu) BY host.name\n| WHERE avg(cpu) > 0.9'],
      [
        'STATS grouped by the metadata fields',
        `FROM logs-* ${METADATA} | STATS c = COUNT(*) BY _id, _index, _version`,
      ],
      ['ROW source', 'ROW x = 1 | WHERE x > 0'],
      ['TS source', 'TS metrics-* | WHERE cpu > 0.9 | KEEP host.name'],
      ['DROP _id', 'FROM logs-* | DROP _id | KEEP host.name'],
      ['wildcard DROP', 'FROM logs-* | DROP labels.* | KEEP host.name'],
      ['RENAME _id AS …', 'FROM logs-* | RENAME _id AS doc_id | KEEP host.name'],
      ['RENAME … = _id', 'FROM logs-* | RENAME doc_id = _id | KEEP host.name'],
      ['RENAME overwriting _id', 'FROM logs-* | RENAME host.name AS _id | KEEP message'],
      ['EVAL _version = …', 'FROM logs-* | EVAL _version = 1 | KEEP host.name'],
      ['EVAL _id = … without KEEP', 'FROM logs-* | EVAL _id = "fixed"'],
    ])('%s', (_name, query) => {
      expect(planDeduplicationQuery(query)).toEqual({
        query,
        eligible: false,
        mvExpandFields: [],
      });
    });
  });
});

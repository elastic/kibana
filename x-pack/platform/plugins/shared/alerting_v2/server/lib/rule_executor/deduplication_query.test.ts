/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectDeduplicationMetadata } from './deduplication_query';

describe('injectDeduplicationMetadata', () => {
  it('adds METADATA _id, _index, _version to a bare FROM', () => {
    expect(injectDeduplicationMetadata('FROM logs-*')).toBe(
      'FROM logs-* METADATA _id, _index, _version'
    );
  });

  it('injects before downstream commands', () => {
    expect(injectDeduplicationMetadata('FROM logs-* | WHERE x > 5 | LIMIT 10')).toBe(
      'FROM logs-* METADATA _id, _index, _version | WHERE x > 5 | LIMIT 10'
    );
  });

  it('is a no-op when all three fields are already declared', () => {
    expect(injectDeduplicationMetadata('FROM logs-* METADATA _id, _index, _version')).toBe(
      'FROM logs-* METADATA _id, _index, _version'
    );
  });

  it('appends only the missing fields to an existing METADATA clause', () => {
    expect(injectDeduplicationMetadata('FROM logs-* METADATA _index')).toBe(
      'FROM logs-* METADATA _index, _id, _version'
    );
  });

  it('leaves aggregating queries untouched, including formatting', () => {
    const query = 'FROM metrics-*\n| STATS avg(cpu) BY host.name\n| WHERE avg(cpu) > 0.9';
    expect(injectDeduplicationMetadata(query)).toBe(query);
  });

  it('appends the fields to KEEP so they survive projection', () => {
    expect(injectDeduplicationMetadata('FROM logs-* | KEEP host.name, message')).toBe(
      'FROM logs-* METADATA _id, _index, _version | KEEP host.name, message, _id, _index, _version'
    );
  });

  it('does not duplicate fields already present in KEEP', () => {
    expect(injectDeduplicationMetadata('FROM logs-* METADATA _id | KEEP _id, host.name')).toBe(
      'FROM logs-* METADATA _id, _index, _version | KEEP _id, host.name, _index, _version'
    );
  });

  it('stops KEEP injection after an explicit DROP of the field', () => {
    expect(injectDeduplicationMetadata('FROM logs-* | DROP _id | KEEP host.name')).toBe(
      'FROM logs-* METADATA _id, _index, _version | DROP _id | KEEP host.name, _index, _version'
    );
  });

  it('stops KEEP injection after a wildcard DROP', () => {
    expect(injectDeduplicationMetadata('FROM logs-* | DROP _* | KEEP host.name')).toBe(
      'FROM logs-* METADATA _id, _index, _version | DROP _* | KEEP host.name'
    );
  });

  it('stops KEEP injection after RENAME of the field', () => {
    expect(injectDeduplicationMetadata('FROM logs-* | RENAME _id AS doc_id | KEEP host.name')).toBe(
      'FROM logs-* METADATA _id, _index, _version | RENAME _id AS doc_id | KEEP host.name, _index, _version'
    );
  });

  it('stops KEEP injection after EVAL overwrites the field', () => {
    expect(injectDeduplicationMetadata('FROM logs-* | EVAL _version = 1 | KEEP host.name')).toBe(
      'FROM logs-* METADATA _id, _index, _version | EVAL _version = 1 | KEEP host.name, _id, _index'
    );
  });

  it.each([
    ['ROW', 'ROW x = 1 | WHERE x > 0'],
    ['TS', 'TS metrics-* | WHERE cpu > 0.9'],
  ])('leaves a %s source unchanged because there is no FROM to carry METADATA', (_name, query) => {
    expect(injectDeduplicationMetadata(query)).toBe(query);
  });
});

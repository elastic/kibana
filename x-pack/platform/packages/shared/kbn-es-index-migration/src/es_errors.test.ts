/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  classifyEsError,
  describeEsRefusal,
  isMappingConflict,
  isTotalFieldsBreach,
} from './es_errors';

/** Reason strings are quoted verbatim from a real Elasticsearch 9.7 cluster. */
const esError = (type: string, reason: string) => ({ meta: { body: { error: { type, reason } } } });

const TYPE_CONFLICT = esError(
  'illegal_argument_exception',
  'mapper [a] cannot be changed from type [keyword] to [text]'
);
const PARAM_CONFLICT = esError(
  'illegal_argument_exception',
  'Mapper for [a] conflicts with existing mapper:\n\tCannot update parameter [norms] from [true] to [false]'
);
const OBJECT_CONFLICT = esError(
  'mapper_exception',
  "the [enabled] parameter can't be updated for the object mapping [a]"
);
const FIELD_LIMIT = esError(
  'illegal_argument_exception',
  'Limit of total fields [3] has been exceeded'
);

describe('isMappingConflict', () => {
  it('recognises a field-level conflict', () => {
    expect(isMappingConflict(TYPE_CONFLICT)).toBe(true);
    expect(isMappingConflict(PARAM_CONFLICT)).toBe(true);
  });

  it('recognises an object-level conflict, which uses a different exception type', () => {
    expect(isMappingConflict(OBJECT_CONFLICT)).toBe(true);
  });

  it('does not treat a field-limit breach as a conflict', () => {
    // Elasticsearch reports both with illegal_argument_exception; only the reason differs.
    expect(isMappingConflict(FIELD_LIMIT)).toBe(false);
    expect(isTotalFieldsBreach(FIELD_LIMIT)).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isMappingConflict(esError('index_not_found_exception', 'no such index'))).toBe(false);
    expect(isMappingConflict(new Error('socket hang up'))).toBe(false);
  });
});

describe('classifyEsError', () => {
  it.each([
    [TYPE_CONFLICT, 'mapping_conflict'],
    [PARAM_CONFLICT, 'mapping_conflict'],
    [OBJECT_CONFLICT, 'mapping_conflict'],
    [FIELD_LIMIT, 'total_fields_breach'],
    [esError('index_not_found_exception', 'no such index'), 'unknown'],
  ])('classifies correctly', (error, expected) => {
    expect(classifyEsError(error)).toBe(expected);
  });

  it('reads an error body however the client nests it', () => {
    expect(classifyEsError({ body: { error: { type: 'mapper_exception' } } })).toBe(
      'mapping_conflict'
    );
    expect(classifyEsError({ error: { type: 'mapper_exception' } })).toBe('mapping_conflict');
  });
});

describe('describeEsRefusal', () => {
  it("quotes Elasticsearch's own reason, which names the offending parameter", () => {
    expect(describeEsRefusal(PARAM_CONFLICT)).toContain('Cannot update parameter [norms]');
  });

  it('explains that a rollover cannot fix a field-limit breach', () => {
    const message = describeEsRefusal(FIELD_LIMIT);

    expect(message).toContain('Limit of total fields');
    expect(message).toContain('a rollover cannot fix it');
  });

  it('falls back to the message when there is no Elasticsearch body', () => {
    expect(describeEsRefusal(new Error('socket hang up'))).toBe('socket hang up');
  });
});

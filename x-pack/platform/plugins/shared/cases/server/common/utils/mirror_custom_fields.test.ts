/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { isBoom } from '@hapi/boom';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import { getTypedApiErrorAttributes } from '../api_errors';
import { buildFieldLinkIndexes } from './field_link_resolution';
import {
  logUnresolvedMirrorKeys,
  mergeCustomFieldsIntoExtendedFieldsResolved,
  throwIfMalformedFieldLinkage,
} from './mirror_custom_fields';

const makeDefinition = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
  fieldDefinitionId: 'def-1',
  name: 'my_text',
  owner: 'cases',
  definition: 'name: my_text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
  isGlobal: true,
  ...overrides,
});

describe('mergeCustomFieldsIntoExtendedFieldsResolved', () => {
  const linkedIndexes = () => buildFieldLinkIndexes([makeDefinition({ legacyKey: 'text_key_1' })]);

  it('mirrors a value under the resolved storage key, never the raw v1 key', () => {
    const result = mergeCustomFieldsIntoExtendedFieldsResolved(
      [{ key: 'text_key_1', type: 'text', value: 'hello' }],
      {},
      linkedIndexes()
    );

    expect(result.extendedFields).toEqual({ my_text_as_keyword: 'hello' });
    expect(result.extendedFields).not.toHaveProperty('text_key_1_as_keyword');
    expect(result.unresolvedKeys).toEqual([]);
    expect(result.malformedFields).toEqual([]);
  });

  it('resolves through a name fallback when the definition has no legacyKey yet', () => {
    // Pre-friendly-name definition: name === raw key, no legacyKey.
    const indexes = buildFieldLinkIndexes([
      makeDefinition({
        name: 'Text_Key_1',
        definition: 'name: Text_Key_1\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
      }),
    ]);

    const result = mergeCustomFieldsIntoExtendedFieldsResolved(
      [{ key: 'text_key_1', type: 'text', value: 'hello' }],
      {},
      indexes
    );

    // Storage key uses the definition's immutable name (case preserved), not the raw key.
    const expectedStorageKey = 'Text_Key_1_as_keyword';
    expect(result.extendedFields).toEqual({ [expectedStorageKey]: 'hello' });
  });

  it('clears the mirror key when the value is null', () => {
    const result = mergeCustomFieldsIntoExtendedFieldsResolved(
      [{ key: 'text_key_1', type: 'text', value: null }],
      { my_text_as_keyword: 'stale', other_key: 'kept' },
      linkedIndexes()
    );

    expect(result.extendedFields).toEqual({ other_key: 'kept' });
  });

  it('skips unresolved fields entirely — no raw-key orphan is ever written', () => {
    const existing = { untouched: 'yes' };
    const result = mergeCustomFieldsIntoExtendedFieldsResolved(
      [{ key: 'unknown_key', type: 'text', value: 'hello' }],
      existing,
      buildFieldLinkIndexes([])
    );

    // Same reference — a skipped field is a no-op, not a write.
    expect(result.extendedFields).toBe(existing);
    expect(result.unresolvedKeys).toEqual(['unknown_key']);
  });

  it('reports ambiguous name matches as unresolved (skip), not malformed', () => {
    const indexes = buildFieldLinkIndexes([
      makeDefinition({
        fieldDefinitionId: 'a',
        name: 'Text_Key_1',
        definition: 'name: Text_Key_1\nlabel: A\ntype: keyword\ncontrol: INPUT_TEXT\n',
      }),
      makeDefinition({
        fieldDefinitionId: 'b',
        name: 'TEXT_KEY_1',
        definition: 'name: TEXT_KEY_1\nlabel: B\ntype: keyword\ncontrol: INPUT_TEXT\n',
      }),
    ]);

    const result = mergeCustomFieldsIntoExtendedFieldsResolved(
      [{ key: 'text_key_1', type: 'text', value: 'hello' }],
      {},
      indexes
    );

    expect(result.unresolvedKeys).toEqual(['text_key_1']);
    expect(result.malformedFields).toEqual([]);
  });

  it('collects malformed linkage instead of guessing', () => {
    const indexes = buildFieldLinkIndexes([
      makeDefinition({ fieldDefinitionId: 'a', name: 'one', legacyKey: 'text_key_1' }),
      makeDefinition({ fieldDefinitionId: 'b', name: 'two', legacyKey: 'text_key_1' }),
    ]);

    const result = mergeCustomFieldsIntoExtendedFieldsResolved(
      [{ key: 'text_key_1', type: 'text', value: 'hello' }],
      {},
      indexes
    );

    expect(result.malformedFields).toEqual([{ key: 'text_key_1', reason: 'duplicate_legacy_key' }]);
  });

  it('returns the same reference when the merge is a value-identical no-op', () => {
    const existing = { my_text_as_keyword: 'hello' };
    const result = mergeCustomFieldsIntoExtendedFieldsResolved(
      [{ key: 'text_key_1', type: 'text', value: 'hello' }],
      existing,
      linkedIndexes()
    );

    expect(result.extendedFields).toBe(existing);
  });

  it('keeps the String(value) codec of the legacy merge (reversible codecs are PR-C scope)', () => {
    const toggleIndexes = buildFieldLinkIndexes([
      makeDefinition({
        legacyKey: 'toggle_key',
        name: 'my_toggle',
        definition: 'name: my_toggle\nlabel: T\ntype: boolean\ncontrol: TOGGLE\n',
      }),
    ]);

    const result = mergeCustomFieldsIntoExtendedFieldsResolved(
      [{ key: 'toggle_key', type: 'toggle', value: false }],
      {},
      toggleIndexes
    );

    expect(result.extendedFields).toEqual({ my_toggle_as_boolean: 'false' });
  });
});

describe('throwIfMalformedFieldLinkage', () => {
  it('is a no-op for an empty list', () => {
    expect(() => throwIfMalformedFieldLinkage([])).not.toThrow();
  });

  it('throws a structured 400 with typed field_linkage_malformed attributes', () => {
    expect.assertions(4);
    try {
      throwIfMalformedFieldLinkage([{ key: 'text_key_1', reason: 'duplicate_legacy_key' }]);
    } catch (error) {
      expect(isBoom(error)).toBe(true);
      expect(error.output.statusCode).toBe(400);
      expect(error.message).toContain('"text_key_1" (duplicate_legacy_key)');
      expect(getTypedApiErrorAttributes(error)).toEqual({
        code: 'field_linkage_malformed',
        fields: [{ key: 'text_key_1', reason: 'duplicate_legacy_key' }],
      });
    }
  });
});

describe('logUnresolvedMirrorKeys', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => jest.clearAllMocks());

  it('does not log for an empty list', () => {
    logUnresolvedMirrorKeys([], { owner: 'cases', logger });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs one warning naming the skipped keys and owner', () => {
    logUnresolvedMirrorKeys(['a', 'b'], { owner: 'cases', logger });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[a, b]'));
  });
});

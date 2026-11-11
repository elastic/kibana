/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import { getTypedApiErrorAttributes } from '../api_errors';
import { buildFieldLinkIndexes } from './field_link_resolution';
import {
  buildActiveLinkMaps,
  pairCreatedCaseFields,
  pairUpdatedCaseFields,
  incrementPairedWriteCounter,
  throwIfFieldRepresentationConflicts,
  throwIfInvalidLinkedFieldValues,
} from './pair_field_representations';

const makeDefinition = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
  fieldDefinitionId: 'def-1',
  name: 'my_text',
  owner: 'cases',
  definition: 'name: my_text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
  isGlobal: true,
  ...overrides,
});

const definitions = [
  makeDefinition({ legacyKey: 'text_key' }),
  makeDefinition({
    fieldDefinitionId: 'def-2',
    name: 'my_number',
    legacyKey: 'number_key',
    definition: 'name: my_number\nlabel: My Number\ntype: integer\ncontrol: INPUT_NUMBER\n',
  }),
  makeDefinition({
    fieldDefinitionId: 'def-3',
    name: 'my_toggle',
    legacyKey: 'toggle_key',
    definition: 'name: my_toggle\nlabel: My Toggle\ntype: boolean\ncontrol: TOGGLE\n',
  }),
];

const configuredFields = [
  { key: 'text_key', type: 'text' },
  { key: 'number_key', type: 'number' },
  { key: 'toggle_key', type: 'toggle' },
];

const makeLinks = () => buildActiveLinkMaps(configuredFields, buildFieldLinkIndexes(definitions));

describe('buildActiveLinkMaps', () => {
  it('indexes resolved links by v1 key and by storage key', () => {
    const links = makeLinks();

    expect(links.byKey.get('text_key')).toMatchObject({
      storageKey: 'my_text_as_keyword',
      name: 'my_text',
      type: 'text',
    });
    expect(links.byStorageKey.get('my_number_as_integer')).toMatchObject({ key: 'number_key' });
    expect(links.malformedByKey.size).toBe(0);
    expect(links.unresolvedKeys.size).toBe(0);
  });

  it('classifies unresolved and malformed configured fields', () => {
    const links = buildActiveLinkMaps(
      [
        { key: 'orphan_key', type: 'text' },
        { key: 'dup_key', type: 'text' },
      ],
      buildFieldLinkIndexes([
        makeDefinition({ fieldDefinitionId: 'a', name: 'one', legacyKey: 'dup_key' }),
        makeDefinition({ fieldDefinitionId: 'b', name: 'two', legacyKey: 'dup_key' }),
      ])
    );

    expect(links.unresolvedKeys.has('orphan_key')).toBe(true);
    expect(links.malformedByKey.get('dup_key')).toEqual({
      key: 'dup_key',
      reason: 'duplicate_legacy_key',
    });
    expect(links.byKey.size).toBe(0);
  });
});

describe('pairUpdatedCaseFields', () => {
  describe('v1-originated writes', () => {
    it('mirrors customFields values through the codecs into the linked storage keys', () => {
      const result = pairUpdatedCaseFields({
        requestCustomFields: [
          { key: 'text_key', type: 'text', value: 'hello' },
          { key: 'number_key', type: 'number', value: 42 },
          { key: 'toggle_key', type: 'toggle', value: false },
        ],
        requestExtendedFields: undefined,
        baseCustomFields: [],
        baseExtendedFields: {},
        links: makeLinks(),
      });

      expect(result.extendedFields).toEqual({
        my_text_as_keyword: 'hello',
        my_number_as_integer: '42',
        my_toggle_as_boolean: 'false',
      });
      expect(result.pairedKeyToStorageKey).toEqual({
        text_key: 'my_text_as_keyword',
        number_key: 'my_number_as_integer',
        toggle_key: 'my_toggle_as_boolean',
      });
    });

    it('clears the linked storage key on an explicit v1 null', () => {
      const result = pairUpdatedCaseFields({
        requestCustomFields: [{ key: 'text_key', type: 'text', value: null }],
        requestExtendedFields: undefined,
        baseCustomFields: [],
        baseExtendedFields: { my_text_as_keyword: 'stale', unrelated: 'kept' },
        links: makeLinks(),
      });

      expect(result.extendedFields).toEqual({ unrelated: 'kept' });
    });

    it('rejects a v1 value the codec cannot encode instead of coercing', () => {
      const result = pairUpdatedCaseFields({
        requestCustomFields: [{ key: 'number_key', type: 'number', value: 1.5 }],
        requestExtendedFields: undefined,
        baseCustomFields: [],
        baseExtendedFields: {},
        links: makeLinks(),
      });

      expect(result.invalidValues).toHaveLength(1);
      expect(result.invalidValues[0].storageKey).toBe('my_number_as_integer');
    });

    it('collects unresolved and malformed request-touched keys', () => {
      const links = buildActiveLinkMaps(
        [
          { key: 'orphan_key', type: 'text' },
          { key: 'dup_key', type: 'text' },
        ],
        buildFieldLinkIndexes([
          makeDefinition({ fieldDefinitionId: 'a', name: 'one', legacyKey: 'dup_key' }),
          makeDefinition({ fieldDefinitionId: 'b', name: 'two', legacyKey: 'dup_key' }),
        ])
      );

      const result = pairUpdatedCaseFields({
        requestCustomFields: [
          { key: 'orphan_key', type: 'text', value: 'x' },
          { key: 'dup_key', type: 'text', value: 'y' },
        ],
        requestExtendedFields: undefined,
        baseCustomFields: [],
        baseExtendedFields: {},
        links,
      });

      expect(result.unresolvedKeys).toEqual(['orphan_key']);
      expect(result.malformedFields).toEqual([{ key: 'dup_key', reason: 'duplicate_legacy_key' }]);
    });
  });

  describe('v2-originated writes', () => {
    it('derives the linked v1 entry through the codecs', () => {
      const baseCustomFields = [{ key: 'number_key', type: 'number', value: 1 }];
      const result = pairUpdatedCaseFields({
        requestCustomFields: undefined,
        requestExtendedFields: { my_number_as_integer: '42' },
        baseCustomFields,
        baseExtendedFields: { my_number_as_integer: '42' },
        links: makeLinks(),
      });

      expect(result.customFields).toEqual([{ key: 'number_key', type: 'number', value: 42 }]);
      expect(result.pairedKeyToStorageKey).toEqual({ number_key: 'my_number_as_integer' });
    });

    it('adds a missing v1 entry when v2 writes a linked field the case never had', () => {
      const result = pairUpdatedCaseFields({
        requestCustomFields: undefined,
        requestExtendedFields: { my_toggle_as_boolean: 'true' },
        baseCustomFields: [{ key: 'text_key', type: 'text', value: 'keep' }],
        baseExtendedFields: { my_toggle_as_boolean: 'true' },
        links: makeLinks(),
      });

      expect(result.customFields).toEqual([
        { key: 'text_key', type: 'text', value: 'keep' },
        { key: 'toggle_key', type: 'toggle', value: true },
      ]);
    });

    it('treats explicit v2 empty string as clear: removes the key and nulls the v1 entry', () => {
      const result = pairUpdatedCaseFields({
        requestCustomFields: undefined,
        requestExtendedFields: { my_text_as_keyword: '' },
        baseCustomFields: [{ key: 'text_key', type: 'text', value: 'old' }],
        // The PATCH merge keeps the '' marker in the base map.
        baseExtendedFields: { my_text_as_keyword: '', unrelated: 'kept' },
        links: makeLinks(),
      });

      expect(result.extendedFields).toEqual({ unrelated: 'kept' });
      expect(result.customFields).toEqual([{ key: 'text_key', type: 'text', value: null }]);
    });

    it('rejects a non-canonical storage value instead of guessing', () => {
      const result = pairUpdatedCaseFields({
        requestCustomFields: undefined,
        requestExtendedFields: { my_number_as_integer: '007' },
        baseCustomFields: [],
        baseExtendedFields: { my_number_as_integer: '007' },
        links: makeLinks(),
      });

      expect(result.invalidValues).toHaveLength(1);
      expect(result.invalidValues[0]).toMatchObject({ storageKey: 'my_number_as_integer' });
    });

    it('passes unlinked extended_fields keys through untouched', () => {
      const base = { some_unlinked_key: 'v' };
      const result = pairUpdatedCaseFields({
        requestCustomFields: undefined,
        requestExtendedFields: { some_unlinked_key: 'v' },
        baseCustomFields: [],
        baseExtendedFields: base,
        links: makeLinks(),
      });

      expect(result.extendedFields).toBe(base);
      expect(result.customFields).toBeUndefined();
    });
  });

  describe('dual input', () => {
    it('accepts semantically equal dual input and persists one canonical pair', () => {
      const result = pairUpdatedCaseFields({
        requestCustomFields: [{ key: 'number_key', type: 'number', value: 42 }],
        requestExtendedFields: { my_number_as_integer: '42' },
        baseCustomFields: [{ key: 'number_key', type: 'number', value: 42 }],
        baseExtendedFields: { my_number_as_integer: '42' },
        links: makeLinks(),
      });

      expect(result.conflictFields).toEqual([]);
      expect(result.extendedFields).toEqual({ my_number_as_integer: '42' });
    });

    it('reports conflicting explicit dual input with the immutable definition name', () => {
      const result = pairUpdatedCaseFields({
        requestCustomFields: [{ key: 'number_key', type: 'number', value: 1 }],
        requestExtendedFields: { my_number_as_integer: '2' },
        baseCustomFields: [],
        baseExtendedFields: { my_number_as_integer: '2' },
        links: makeLinks(),
      });

      expect(result.conflictFields).toEqual(['my_number']);
    });

    it('treats explicit v1 null and explicit v2 clear marker as equal (both clear)', () => {
      const result = pairUpdatedCaseFields({
        requestCustomFields: [{ key: 'text_key', type: 'text', value: null }],
        requestExtendedFields: { my_text_as_keyword: '' },
        baseCustomFields: [{ key: 'text_key', type: 'text', value: null }],
        baseExtendedFields: { my_text_as_keyword: '' },
        links: makeLinks(),
      });

      expect(result.conflictFields).toEqual([]);
      expect(result.extendedFields).toEqual({});
    });
  });

  it('returns the same references for a semantic no-op', () => {
    const baseExtendedFields = { my_text_as_keyword: 'same' };
    const baseCustomFields = [{ key: 'text_key', type: 'text', value: 'same' }];

    const result = pairUpdatedCaseFields({
      requestCustomFields: [{ key: 'text_key', type: 'text', value: 'same' }],
      requestExtendedFields: undefined,
      baseCustomFields,
      baseExtendedFields,
      links: makeLinks(),
    });

    expect(result.extendedFields).toBe(baseExtendedFields);
    expect(result.customFields).toBeUndefined();
  });
});

describe('pairCreatedCaseFields', () => {
  it('explicit caller v1 value wins over a template default and the config default', () => {
    const result = pairCreatedCaseFields({
      callerCustomFields: [{ key: 'text_key', type: 'text', value: 'caller' }],
      callerExtendedFields: undefined,
      effectiveCustomFields: [{ key: 'text_key', type: 'text', value: 'caller' }],
      // Template default already merged into the effective map by expansion.
      effectiveExtendedFields: { my_text_as_keyword: 'template-default' },
      links: makeLinks(),
    });

    expect(result.extendedFields).toEqual({ my_text_as_keyword: 'caller' });
  });

  it('explicit caller v2 value wins and is copied to v1 over the config default', () => {
    const result = pairCreatedCaseFields({
      callerCustomFields: undefined,
      callerExtendedFields: { my_number_as_integer: '7' },
      // fillMissingCustomFields already applied the v1 config default.
      effectiveCustomFields: [{ key: 'number_key', type: 'number', value: 99 }],
      effectiveExtendedFields: { my_number_as_integer: '7' },
      links: makeLinks(),
    });

    expect(result.customFields).toEqual([{ key: 'number_key', type: 'number', value: 7 }]);
    expect(result.extendedFields).toEqual({ my_number_as_integer: '7' });
  });

  it('template v2 default wins over the v1 config default and is copied to v1', () => {
    const result = pairCreatedCaseFields({
      callerCustomFields: undefined,
      callerExtendedFields: undefined,
      effectiveCustomFields: [{ key: 'text_key', type: 'text', value: 'config-default' }],
      effectiveExtendedFields: { my_text_as_keyword: 'template-default' },
      links: makeLinks(),
    });

    expect(result.customFields).toEqual([
      { key: 'text_key', type: 'text', value: 'template-default' },
    ]);
    expect(result.extendedFields).toEqual({ my_text_as_keyword: 'template-default' });
  });

  it('copies the filled v1 config default to v2 when nothing else supplies a value', () => {
    const result = pairCreatedCaseFields({
      callerCustomFields: undefined,
      callerExtendedFields: undefined,
      effectiveCustomFields: [{ key: 'toggle_key', type: 'toggle', value: true }],
      effectiveExtendedFields: undefined,
      links: makeLinks(),
    });

    expect(result.extendedFields).toEqual({ my_toggle_as_boolean: 'true' });
  });

  it('a filled synthetic null leaves the absent v2 key absent (consistent empty pair)', () => {
    const result = pairCreatedCaseFields({
      callerCustomFields: undefined,
      callerExtendedFields: undefined,
      effectiveCustomFields: [{ key: 'text_key', type: 'text', value: null }],
      effectiveExtendedFields: undefined,
      links: makeLinks(),
    });

    expect(result.extendedFields).toBeUndefined();
    expect(result.customFields).toBeUndefined();
  });

  it('explicit v2 empty string on create clears: no v2 key, canonical v1 empty value', () => {
    const result = pairCreatedCaseFields({
      callerCustomFields: undefined,
      callerExtendedFields: { my_text_as_keyword: '' },
      effectiveCustomFields: [{ key: 'text_key', type: 'text', value: 'config-default' }],
      effectiveExtendedFields: { my_text_as_keyword: '' },
      links: makeLinks(),
    });

    expect(result.extendedFields).toEqual({});
    expect(result.customFields).toEqual([{ key: 'text_key', type: 'text', value: null }]);
  });

  it('rejects conflicting explicit dual input on create', () => {
    const result = pairCreatedCaseFields({
      callerCustomFields: [{ key: 'toggle_key', type: 'toggle', value: true }],
      callerExtendedFields: { my_toggle_as_boolean: 'false' },
      effectiveCustomFields: [{ key: 'toggle_key', type: 'toggle', value: true }],
      effectiveExtendedFields: { my_toggle_as_boolean: 'false' },
      links: makeLinks(),
    });

    expect(result.conflictFields).toEqual(['my_toggle']);
  });

  it('accepts equal explicit dual input on create', () => {
    const result = pairCreatedCaseFields({
      callerCustomFields: [{ key: 'toggle_key', type: 'toggle', value: true }],
      callerExtendedFields: { my_toggle_as_boolean: 'true' },
      effectiveCustomFields: [{ key: 'toggle_key', type: 'toggle', value: true }],
      effectiveExtendedFields: { my_toggle_as_boolean: 'true' },
      links: makeLinks(),
    });

    expect(result.conflictFields).toEqual([]);
    expect(result.extendedFields).toEqual({ my_toggle_as_boolean: 'true' });
  });

  it('reports explicitly-touched unlinked v1 keys', () => {
    const links = buildActiveLinkMaps(
      [{ key: 'orphan_key', type: 'text' }],
      buildFieldLinkIndexes([])
    );
    const result = pairCreatedCaseFields({
      callerCustomFields: [{ key: 'orphan_key', type: 'text', value: 'x' }],
      callerExtendedFields: undefined,
      effectiveCustomFields: [{ key: 'orphan_key', type: 'text', value: 'x' }],
      effectiveExtendedFields: undefined,
      links,
    });

    expect(result.unresolvedKeys).toEqual(['orphan_key']);
    expect(result.extendedFields).toBeUndefined();
  });
});

describe('throwIfFieldRepresentationConflicts', () => {
  it('is a no-op for an empty list', () => {
    expect(() => throwIfFieldRepresentationConflicts([])).not.toThrow();
  });

  it('throws a structured 400 with typed field_representations_conflict attributes', () => {
    expect.assertions(4);
    try {
      throwIfFieldRepresentationConflicts(['my_number']);
    } catch (error) {
      expect(isBoom(error)).toBe(true);
      expect(error.output.statusCode).toBe(400);
      expect(error.message).toContain('"my_number"');
      expect(getTypedApiErrorAttributes(error)).toEqual({
        code: 'field_representations_conflict',
        fields: ['my_number'],
      });
    }
  });

  it('increments the conflict usage counter before throwing', () => {
    const usageCounter = { incrementCounter: jest.fn(), domainId: 'cases' };

    expect(() => throwIfFieldRepresentationConflicts(['my_number'], usageCounter)).toThrow();
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'caseFieldsRepresentationsConflict',
    });

    expect(() => throwIfFieldRepresentationConflicts([], usageCounter)).not.toThrow();
    expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
  });
});

describe('incrementPairedWriteCounter', () => {
  const pairedResult = (pairedKeyToStorageKey: Record<string, string>) => ({
    customFields: undefined,
    extendedFields: undefined,
    conflictFields: [],
    invalidValues: [],
    malformedFields: [],
    unresolvedKeys: [],
    pairedKeyToStorageKey,
  });

  it('increments only when the pairing changed a representation of a linked field', () => {
    const usageCounter = { incrementCounter: jest.fn(), domainId: 'cases' };

    incrementPairedWriteCounter(usageCounter, pairedResult({ my_key: 'my_key_as_keyword' }), true);
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'caseFieldsPairedWrite',
    });

    // No-op pairing and unlinked writes are not paired writes.
    incrementPairedWriteCounter(usageCounter, pairedResult({ my_key: 'my_key_as_keyword' }), false);
    incrementPairedWriteCounter(usageCounter, pairedResult({}), true);
    expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
  });

  it('tolerates a missing usage counter', () => {
    expect(() =>
      incrementPairedWriteCounter(undefined, pairedResult({ my_key: 'my_key_as_keyword' }), true)
    ).not.toThrow();
  });
});

describe('throwIfInvalidLinkedFieldValues', () => {
  it('is a no-op for an empty list', () => {
    expect(() => throwIfInvalidLinkedFieldValues([])).not.toThrow();
  });

  it('throws a 400 naming the storage key and codec error', () => {
    expect.assertions(3);
    try {
      throwIfInvalidLinkedFieldValues([
        { storageKey: 'my_number_as_integer', error: 'expected a canonical base-10 integer' },
      ]);
    } catch (error) {
      expect(isBoom(error)).toBe(true);
      expect(error.output.statusCode).toBe(400);
      expect(error.message).toContain('my_number_as_integer');
    }
  });
});

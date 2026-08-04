/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import {
  addDefinitionToIndexes,
  buildFieldLinkIndexes,
  getActivelyLinkedDefinitionIds,
  registerRepairedLegacyKey,
  resolveDefinitionForLegacyField,
} from './field_link_resolution';

const makeDefinition = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
  fieldDefinitionId: 'def-1',
  name: 'my_text',
  owner: 'cases',
  definition: 'name: my_text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
  isGlobal: true,
  ...overrides,
});

const textField = { key: 'text_key_1', type: 'text' };

describe('buildFieldLinkIndexes', () => {
  it('indexes definitions by legacyKey, exact name, and normalized name', () => {
    const definition = makeDefinition({ legacyKey: 'text_key_1', name: 'My_Text' });
    const indexes = buildFieldLinkIndexes([definition]);

    expect(indexes.byLegacyKey.get('text_key_1')).toHaveLength(1);
    expect(indexes.byExactName.get('My_Text')).toHaveLength(1);
    expect(indexes.byNormalizedName.get('my_text')).toHaveLength(1);
  });

  it('carries the SO version when given full saved objects', () => {
    const indexes = buildFieldLinkIndexes([
      { attributes: makeDefinition(), version: 'so-version-3' },
    ]);
    expect(indexes.all[0].version).toBe('so-version-3');
  });

  it('leaves identity undefined for malformed YAML', () => {
    const indexes = buildFieldLinkIndexes([makeDefinition({ definition: '{{{nope' })]);
    expect(indexes.all[0].identity).toBeUndefined();
  });
});

describe('resolveDefinitionForLegacyField', () => {
  describe('legacyKey matches', () => {
    it('resolves an exact legacyKey match without repair', () => {
      const indexes = buildFieldLinkIndexes([makeDefinition({ legacyKey: 'text_key_1' })]);
      const resolution = resolveDefinitionForLegacyField(textField, indexes);

      expect(resolution).toMatchObject({
        status: 'resolved',
        storageKey: 'my_text_as_keyword',
        needsLegacyKeyRepair: false,
      });
    });

    it('classifies duplicate legacyKey claims as malformed', () => {
      const indexes = buildFieldLinkIndexes([
        makeDefinition({ fieldDefinitionId: 'a', name: 'one', legacyKey: 'text_key_1' }),
        makeDefinition({ fieldDefinitionId: 'b', name: 'two', legacyKey: 'text_key_1' }),
      ]);

      expect(resolveDefinitionForLegacyField(textField, indexes)).toEqual({
        status: 'malformed',
        reason: 'duplicate_legacy_key',
      });
    });

    it('classifies a legacyKey match with an incompatible type as malformed', () => {
      const indexes = buildFieldLinkIndexes([
        makeDefinition({
          legacyKey: 'text_key_1',
          definition: 'name: my_text\nlabel: My Text\ntype: integer\ncontrol: INPUT_NUMBER\n',
        }),
      ]);

      expect(resolveDefinitionForLegacyField(textField, indexes)).toEqual({
        status: 'malformed',
        reason: 'type_mismatch',
      });
    });

    it('classifies a legacyKey match whose YAML cannot be parsed as malformed', () => {
      const indexes = buildFieldLinkIndexes([
        makeDefinition({ legacyKey: 'text_key_1', definition: '{{{nope' }),
      ]);

      expect(resolveDefinitionForLegacyField(textField, indexes)).toEqual({
        status: 'malformed',
        reason: 'unparseable_definition',
      });
    });

    it('prefers the legacyKey match over a name match on another definition', () => {
      const indexes = buildFieldLinkIndexes([
        // Unlinked definition whose name happens to equal the raw v1 key.
        makeDefinition({
          fieldDefinitionId: 'name-match',
          name: 'text_key_1',
          definition: 'name: text_key_1\nlabel: A\ntype: keyword\ncontrol: INPUT_TEXT\n',
        }),
        makeDefinition({ fieldDefinitionId: 'linked', legacyKey: 'text_key_1' }),
      ]);

      const resolution = resolveDefinitionForLegacyField(textField, indexes);
      expect(resolution).toMatchObject({ status: 'resolved', needsLegacyKeyRepair: false });
      if (resolution.status === 'resolved') {
        expect(resolution.link.definition.fieldDefinitionId).toBe('linked');
      }
    });
  });

  describe('name fallbacks', () => {
    it('resolves a unique byte-exact name match and flags it for repair', () => {
      const indexes = buildFieldLinkIndexes([
        makeDefinition({
          name: 'text_key_1',
          definition: 'name: text_key_1\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
        }),
      ]);

      expect(resolveDefinitionForLegacyField(textField, indexes)).toMatchObject({
        status: 'resolved',
        storageKey: 'text_key_1_as_keyword',
        needsLegacyKeyRepair: true,
      });
    });

    it('resolves a unique normalized-name match (trim + lowercase) and flags it for repair', () => {
      const indexes = buildFieldLinkIndexes([
        makeDefinition({
          name: 'Text_Key_1',
          definition: 'name: Text_Key_1\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
        }),
      ]);

      const resolution = resolveDefinitionForLegacyField(textField, indexes);
      expect(resolution).toMatchObject({
        status: 'resolved',
        // Storage key uses the definition's immutable name, never the raw v1 key.
        storageKey: 'Text_Key_1_as_keyword',
        needsLegacyKeyRepair: true,
      });
    });

    it('never uses a name match whose definition is already linked to a different key', () => {
      const indexes = buildFieldLinkIndexes([
        makeDefinition({
          name: 'text_key_1',
          legacyKey: 'some_other_key',
          definition: 'name: text_key_1\nlabel: A\ntype: keyword\ncontrol: INPUT_TEXT\n',
        }),
      ]);

      expect(resolveDefinitionForLegacyField(textField, indexes)).toEqual({
        status: 'unresolved',
        reason: 'no_match',
      });
    });

    it('never uses a type-incompatible name match', () => {
      const indexes = buildFieldLinkIndexes([
        makeDefinition({
          name: 'text_key_1',
          definition: 'name: text_key_1\nlabel: A\ntype: integer\ncontrol: INPUT_NUMBER\n',
        }),
      ]);

      expect(resolveDefinitionForLegacyField(textField, indexes)).toEqual({
        status: 'unresolved',
        reason: 'no_match',
      });
    });

    it('treats multiple normalized-name candidates as ambiguous (never first-wins)', () => {
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

      expect(resolveDefinitionForLegacyField(textField, indexes)).toEqual({
        status: 'unresolved',
        reason: 'ambiguous_name_match',
      });
    });

    it('returns no_match when nothing matches', () => {
      const indexes = buildFieldLinkIndexes([makeDefinition({ name: 'unrelated' })]);
      expect(resolveDefinitionForLegacyField(textField, indexes)).toEqual({
        status: 'unresolved',
        reason: 'no_match',
      });
    });
  });

  describe('v1 type mapping', () => {
    it('maps toggle → boolean and number → integer for compatibility checks', () => {
      const toggleDef = makeDefinition({
        legacyKey: 'toggle_key',
        name: 'my_toggle',
        definition: 'name: my_toggle\nlabel: T\ntype: boolean\ncontrol: TOGGLE\n',
      });
      const numberDef = makeDefinition({
        fieldDefinitionId: 'def-2',
        legacyKey: 'number_key',
        name: 'my_number',
        definition: 'name: my_number\nlabel: N\ntype: integer\ncontrol: INPUT_NUMBER\n',
      });
      const indexes = buildFieldLinkIndexes([toggleDef, numberDef]);

      expect(
        resolveDefinitionForLegacyField({ key: 'toggle_key', type: 'toggle' }, indexes)
      ).toMatchObject({ status: 'resolved', storageKey: 'my_toggle_as_boolean' });
      expect(
        resolveDefinitionForLegacyField({ key: 'number_key', type: 'number' }, indexes)
      ).toMatchObject({ status: 'resolved', storageKey: 'my_number_as_integer' });
    });
  });
});

describe('addDefinitionToIndexes', () => {
  it('makes a just-created definition resolvable in the same pass', () => {
    const indexes = buildFieldLinkIndexes([]);
    addDefinitionToIndexes(indexes, makeDefinition({ legacyKey: 'text_key_1' }));

    expect(resolveDefinitionForLegacyField(textField, indexes)).toMatchObject({
      status: 'resolved',
      storageKey: 'my_text_as_keyword',
    });
  });
});

describe('registerRepairedLegacyKey', () => {
  it('promotes a name-fallback link to an exact legacyKey link without duplicating name entries', () => {
    const indexes = buildFieldLinkIndexes([
      makeDefinition({
        name: 'text_key_1',
        definition: 'name: text_key_1\nlabel: A\ntype: keyword\ncontrol: INPUT_TEXT\n',
      }),
    ]);

    registerRepairedLegacyKey(indexes, indexes.all[0], 'text_key_1');

    const resolution = resolveDefinitionForLegacyField(textField, indexes);
    expect(resolution).toMatchObject({ status: 'resolved', needsLegacyKeyRepair: false });
    expect(indexes.byExactName.get('text_key_1')).toHaveLength(1);
    expect(indexes.byNormalizedName.get('text_key_1')).toHaveLength(1);
  });
});

describe('getActivelyLinkedDefinitionIds', () => {
  it('returns only definitions some configured field resolves to', () => {
    const indexes = buildFieldLinkIndexes([
      makeDefinition({ fieldDefinitionId: 'linked', legacyKey: 'text_key_1' }),
      makeDefinition({ fieldDefinitionId: 'unlinked', name: 'unrelated' }),
    ]);

    const active = getActivelyLinkedDefinitionIds([textField], indexes);
    expect(active).toEqual(new Set(['linked']));
  });

  it('contributes no active link for malformed or ambiguous resolutions', () => {
    const indexes = buildFieldLinkIndexes([
      makeDefinition({ fieldDefinitionId: 'a', name: 'one', legacyKey: 'text_key_1' }),
      makeDefinition({ fieldDefinitionId: 'b', name: 'two', legacyKey: 'text_key_1' }),
    ]);

    expect(getActivelyLinkedDefinitionIds([textField], indexes)).toEqual(new Set());
  });
});

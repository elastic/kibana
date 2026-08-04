/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import { buildFieldLinkIndexes } from '../../common/utils/field_link_resolution';
import { computeActiveLinkFingerprint } from './link_fingerprint';

const makeDefinition = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
  fieldDefinitionId: 'def-1',
  name: 'my_text',
  owner: 'cases',
  definition: 'name: my_text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
  isGlobal: true,
  ...overrides,
});

const textField = { key: 'text_key_1', type: 'text' };

describe('computeActiveLinkFingerprint', () => {
  it('is deterministic for the same links', () => {
    const indexes = buildFieldLinkIndexes([makeDefinition({ legacyKey: 'text_key_1' })]);

    const first = computeActiveLinkFingerprint([textField], indexes);
    const second = computeActiveLinkFingerprint([textField], indexes);

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is insensitive to configured field order', () => {
    const indexes = buildFieldLinkIndexes([
      makeDefinition({ fieldDefinitionId: 'a', legacyKey: 'text_key_1' }),
      makeDefinition({
        fieldDefinitionId: 'b',
        name: 'my_toggle',
        legacyKey: 'toggle_key_1',
        definition: 'name: my_toggle\nlabel: My Toggle\ntype: boolean\ncontrol: TOGGLE\n',
      }),
    ]);
    const toggleField = { key: 'toggle_key_1', type: 'toggle' };

    expect(computeActiveLinkFingerprint([textField, toggleField], indexes)).toBe(
      computeActiveLinkFingerprint([toggleField, textField], indexes)
    );
  });

  it('changes when a configured field is added or removed', () => {
    const indexes = buildFieldLinkIndexes([makeDefinition({ legacyKey: 'text_key_1' })]);

    const withField = computeActiveLinkFingerprint([textField], indexes);
    const withoutField = computeActiveLinkFingerprint([], indexes);

    expect(withField).not.toBe(withoutField);
  });

  it('changes when a link resolves to a different definition', () => {
    const linkedToA = buildFieldLinkIndexes([
      makeDefinition({ fieldDefinitionId: 'a', legacyKey: 'text_key_1' }),
    ]);
    const linkedToB = buildFieldLinkIndexes([
      makeDefinition({ fieldDefinitionId: 'b', legacyKey: 'text_key_1' }),
    ]);

    expect(computeActiveLinkFingerprint([textField], linkedToA)).not.toBe(
      computeActiveLinkFingerprint([textField], linkedToB)
    );
  });

  it('changes when a field goes from unresolved to resolved', () => {
    const unresolved = computeActiveLinkFingerprint([textField], buildFieldLinkIndexes([]));
    const resolved = computeActiveLinkFingerprint(
      [textField],
      buildFieldLinkIndexes([makeDefinition({ legacyKey: 'text_key_1' })])
    );

    expect(unresolved).not.toBe(resolved);
  });

  it('never embeds labels or values (input is key/type/id/name only)', () => {
    // Two definitions differing only in a (mutable) label-bearing YAML comment
    // beyond identity produce the same fingerprint: only the immutable name,
    // id, and parsed type participate.
    const a = buildFieldLinkIndexes([
      makeDefinition({
        legacyKey: 'text_key_1',
        definition: 'name: my_text\nlabel: Label One\ntype: keyword\ncontrol: INPUT_TEXT\n',
      }),
    ]);
    const b = buildFieldLinkIndexes([
      makeDefinition({
        legacyKey: 'text_key_1',
        definition: 'name: my_text\nlabel: Different Label\ntype: keyword\ncontrol: INPUT_TEXT\n',
      }),
    ]);

    expect(computeActiveLinkFingerprint([textField], a)).toBe(
      computeActiveLinkFingerprint([textField], b)
    );
  });
});

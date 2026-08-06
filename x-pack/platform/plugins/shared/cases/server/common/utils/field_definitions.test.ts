/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';
import {
  MAX_GENERATED_FIELD_NAME_LENGTH,
  buildFieldDefinitionYaml,
  deriveFieldDefinitionId,
  generateFriendlyFieldName,
  normalizeLabelToFieldName,
  parseFieldDefinitionIdentity,
} from './field_definitions';

describe('parseFieldDefinitionIdentity', () => {
  it('extracts name and type from a valid inline field YAML', () => {
    expect(
      parseFieldDefinitionIdentity(
        'name: my_field\nlabel: My Field\ntype: keyword\ncontrol: INPUT_TEXT\n'
      )
    ).toEqual({ name: 'my_field', type: 'keyword' });
  });

  it('returns undefined for unparseable YAML', () => {
    expect(parseFieldDefinitionIdentity('{{{not yaml')).toBeUndefined();
  });

  it('returns undefined for YAML that is not an inline field', () => {
    expect(parseFieldDefinitionIdentity('foo: bar\n')).toBeUndefined();
  });
});

describe('normalizeLabelToFieldName', () => {
  it.each([
    ['My Text', 'my_text'],
    ['  Priority Level!  ', 'priority_level'],
    ['äöü emoji 🚀 field', 'emoji_field'],
    ['already_snake_case', 'already_snake_case'],
    ['___leading__and__trailing___', 'leading_and_trailing'],
    ['UPPER-CASE / slash', 'upper_case_slash'],
    ['!!!', ''],
    ['', ''],
  ])('normalizes %j to %j', (label, expected) => {
    expect(normalizeLabelToFieldName(label)).toBe(expected);
  });
});

describe('generateFriendlyFieldName', () => {
  const notTaken = () => false;

  it('derives the name from the label', () => {
    expect(
      generateFriendlyFieldName({ label: 'My Text', legacyKey: 'key-1', isNameTaken: notTaken })
    ).toBe('my_text');
  });

  it('is deterministic and independent of call order', () => {
    const args = { label: 'Priority Level', legacyKey: 'abc-123', isNameTaken: notTaken };
    expect(generateFriendlyFieldName(args)).toBe(generateFriendlyFieldName({ ...args }));
  });

  it('falls back to a stable hash-based name when the label normalizes to empty', () => {
    const first = generateFriendlyFieldName({
      label: '!!!',
      legacyKey: 'key-1',
      isNameTaken: notTaken,
    });
    const second = generateFriendlyFieldName({
      label: '',
      legacyKey: 'key-1',
      isNameTaken: notTaken,
    });
    expect(first).toMatch(/^custom_field_[0-9a-f]{8}$/);
    expect(second).toBe(first);

    const otherKey = generateFriendlyFieldName({
      label: '',
      legacyKey: 'key-2',
      isNameTaken: notTaken,
    });
    expect(otherKey).not.toBe(first);
  });

  it('appends a deterministic legacy-key suffix on collision', () => {
    const name = generateFriendlyFieldName({
      label: 'My Text',
      legacyKey: 'key-1',
      isNameTaken: (candidate) => candidate === 'my_text',
    });
    expect(name).toBe('my_text_be297454');

    const otherKey = generateFriendlyFieldName({
      label: 'My Text',
      legacyKey: 'key-2',
      isNameTaken: (candidate) => candidate === 'my_text',
    });
    expect(otherKey).toBe('my_text_7c36b0a9');
    expect(otherKey).not.toBe(name);
  });

  it('bounds the generated name and keeps the collision suffix intact for long labels', () => {
    const longLabel = 'x'.repeat(500);

    const base = generateFriendlyFieldName({
      label: longLabel,
      legacyKey: 'key-1',
      isNameTaken: notTaken,
    });
    expect(base.length).toBeLessThanOrEqual(MAX_GENERATED_FIELD_NAME_LENGTH);

    const collided = generateFriendlyFieldName({
      label: longLabel,
      legacyKey: 'key-1',
      isNameTaken: (candidate) => candidate === base,
    });
    expect(collided.length).toBeLessThanOrEqual(MAX_GENERATED_FIELD_NAME_LENGTH);
    expect(collided).toMatch(/_[0-9a-f]{8}$/);

    // Two long colliding labels with different keys stay distinct.
    const collidedOther = generateFriendlyFieldName({
      label: longLabel,
      legacyKey: 'key-2',
      isNameTaken: (candidate) => candidate === base,
    });
    expect(collidedOther).not.toBe(collided);
  });
});

describe('deriveFieldDefinitionId', () => {
  const input = { spaceId: 'default', owner: 'cases', name: 'my_text' };

  it('is a deterministic 36-character UUID', () => {
    const id = deriveFieldDefinitionId(input);
    expect(id).toHaveLength(36);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(deriveFieldDefinitionId({ ...input })).toBe(id);
  });

  it('varies with space, owner, and name', () => {
    const base = deriveFieldDefinitionId(input);
    expect(deriveFieldDefinitionId({ ...input, spaceId: 'other-space' })).not.toBe(base);
    expect(deriveFieldDefinitionId({ ...input, owner: 'securitySolution' })).not.toBe(base);
    expect(deriveFieldDefinitionId({ ...input, name: 'other_name' })).not.toBe(base);
  });

  it('is unambiguous for components that concatenate identically', () => {
    // Without a separator, ('ab','c') and ('a','bc') would collide.
    expect(deriveFieldDefinitionId({ spaceId: 'ab', owner: 'c', name: 'n' })).not.toBe(
      deriveFieldDefinitionId({ spaceId: 'a', owner: 'bc', name: 'n' })
    );
  });
});

describe('buildFieldDefinitionYaml with an explicit name', () => {
  const legacy = {
    key: 'raw-v1-key',
    label: 'My Text',
    type: CustomFieldTypes.TEXT,
    required: false,
  };

  it('uses the provided friendly name as the YAML identity', () => {
    const { name, yaml } = buildFieldDefinitionYaml(legacy, { name: 'my_text' });
    expect(name).toBe('my_text');
    expect(yaml).toContain('name: my_text');
    expect(yaml).not.toContain('raw-v1-key');
  });

  it('defaults to the legacy key when no name is provided (pre-friendly-name behavior)', () => {
    const { name, yaml } = buildFieldDefinitionYaml(legacy);
    expect(name).toBe('raw-v1-key');
    expect(yaml).toContain('name: raw-v1-key');
  });
});

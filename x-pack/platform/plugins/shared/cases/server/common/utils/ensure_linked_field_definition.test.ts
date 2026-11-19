/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import { deriveFieldDefinitionId } from './field_definitions';
import { buildFieldLinkIndexes } from './field_link_resolution';
import { ensureLinkedFieldDefinition } from './ensure_linked_field_definition';

const makeDefinition = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
  fieldDefinitionId: 'def-1',
  name: 'my_text',
  owner: 'cases',
  definition: 'name: my_text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
  isGlobal: true,
  ...overrides,
});

describe('ensureLinkedFieldDefinition', () => {
  const spaceId = 'default';
  const owner = 'cases';
  const textField = { key: 'text_key_1', type: 'text', label: 'My Text', required: false };

  const conflictError = () =>
    SavedObjectsErrorHelpers.createConflictError('cases-field-definition', 'some-id');

  let createDefinition: jest.Mock;
  let fetchDefinitionById: jest.Mock;

  const deps = () => ({ spaceId, owner, createDefinition, fetchDefinitionById });

  beforeEach(() => {
    createDefinition = jest.fn().mockResolvedValue(undefined);
    fetchDefinitionById = jest.fn().mockResolvedValue(undefined);
  });

  it('reuses a resolved link and exposes the linkable for repair', async () => {
    const indexes = buildFieldLinkIndexes([
      {
        attributes: makeDefinition({
          name: 'text_key_1',
          definition: 'name: text_key_1\nlabel: A\ntype: keyword\ncontrol: INPUT_TEXT\n',
        }),
        version: 'v7',
      },
    ]);

    const result = await ensureLinkedFieldDefinition(textField, indexes, deps());

    expect(result).toMatchObject({
      outcome: 'reused',
      needsLegacyKeyRepair: true,
      link: expect.objectContaining({ version: 'v7' }),
    });
    expect(createDefinition).not.toHaveBeenCalled();
  });

  it('surfaces malformed linkage and ambiguity as blocked', async () => {
    const duplicated = buildFieldLinkIndexes([
      makeDefinition({ fieldDefinitionId: 'a', name: 'one', legacyKey: 'text_key_1' }),
      makeDefinition({ fieldDefinitionId: 'b', name: 'two', legacyKey: 'text_key_1' }),
    ]);
    expect(await ensureLinkedFieldDefinition(textField, duplicated, deps())).toEqual({
      outcome: 'blocked',
      reason: 'duplicate_legacy_key',
    });

    const ambiguous = buildFieldLinkIndexes([
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
    expect(await ensureLinkedFieldDefinition(textField, ambiguous, deps())).toEqual({
      outcome: 'blocked',
      reason: 'ambiguous_name_match',
    });
    expect(createDefinition).not.toHaveBeenCalled();
  });

  it('creates a definition with friendly name, deterministic id, and legacyKey', async () => {
    const result = await ensureLinkedFieldDefinition(textField, buildFieldLinkIndexes([]), deps());

    // The id is seeded by legacyKey, not the friendly name — see the concurrent-first-link fix.
    const expectedId = deriveFieldDefinitionId({ spaceId, owner, name: textField.key });
    expect(result).toMatchObject({
      outcome: 'created',
      definition: {
        fieldDefinitionId: expectedId,
        name: 'my_text',
        owner,
        isGlobal: true,
        legacyKey: 'text_key_1',
        description: 'My Text',
      },
    });
    expect(createDefinition).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'my_text' }),
      expectedId
    );
  });

  it('returns the locally-built attributes as authoritative (not the SO echo)', async () => {
    createDefinition.mockResolvedValue({ attributes: {} });

    const result = await ensureLinkedFieldDefinition(textField, buildFieldLinkIndexes([]), deps());

    expect(result.outcome).toBe('created');
    if (result.outcome === 'created') {
      expect(result.definition.name).toBe('my_text');
      expect(result.definition.definition).toContain('name: my_text');
    }
  });

  it('converges on a concurrent creator of the same link after a conflict', async () => {
    const expectedId = deriveFieldDefinitionId({ spaceId, owner, name: textField.key });
    const winner = makeDefinition({ fieldDefinitionId: expectedId, legacyKey: 'text_key_1' });
    createDefinition.mockRejectedValueOnce(conflictError());
    fetchDefinitionById.mockResolvedValueOnce(winner);

    const result = await ensureLinkedFieldDefinition(textField, buildFieldLinkIndexes([]), deps());

    expect(result).toMatchObject({
      outcome: 'reused',
      definition: winner,
      needsLegacyKeyRepair: false,
    });
    expect(createDefinition).toHaveBeenCalledTimes(1);
  });

  it('converges on the same id even when the winner was created from a different label snapshot', async () => {
    // Simulates two concurrent first-time-migration calls for the same legacyKey that observed
    // different `label` values (e.g. the label was edited mid-migration) — they must still
    // compute the same id (seeded by legacyKey, not the label-derived name) and converge.
    const expectedId = deriveFieldDefinitionId({ spaceId, owner, name: textField.key });
    const winner = makeDefinition({
      fieldDefinitionId: expectedId,
      name: 'a_completely_different_name',
      legacyKey: textField.key,
    });
    createDefinition.mockRejectedValueOnce(conflictError());
    fetchDefinitionById.mockResolvedValueOnce(winner);

    const result = await ensureLinkedFieldDefinition(textField, buildFieldLinkIndexes([]), deps());

    expect(result).toMatchObject({
      outcome: 'reused',
      definition: winner,
      needsLegacyKeyRepair: false,
    });
    expect(createDefinition).toHaveBeenCalledTimes(1);
  });

  it('falls back to the legacy-key-suffixed name when the conflict winner is a different link', async () => {
    const foreignWinner = makeDefinition({ legacyKey: 'some_other_key' });
    createDefinition.mockRejectedValueOnce(conflictError()).mockResolvedValueOnce(undefined);
    fetchDefinitionById.mockResolvedValueOnce(foreignWinner);

    const result = await ensureLinkedFieldDefinition(textField, buildFieldLinkIndexes([]), deps());

    expect(result.outcome).toBe('created');
    if (result.outcome === 'created') {
      expect(result.definition.name).toMatch(/^my_text_[0-9a-f]{8}$/);
      expect(result.definition.fieldDefinitionId).toBe(
        deriveFieldDefinitionId({ spaceId, owner, name: result.definition.name })
      );
    }
    expect(createDefinition).toHaveBeenCalledTimes(2);
  });

  it('converges on the suffixed id when the second create also conflicts with the same link', async () => {
    createDefinition.mockRejectedValue(conflictError());
    const suffixedWinner = makeDefinition({ name: 'irrelevant', legacyKey: 'text_key_1' });
    fetchDefinitionById
      .mockResolvedValueOnce(makeDefinition({ legacyKey: 'some_other_key' }))
      .mockResolvedValueOnce(suffixedWinner);

    const result = await ensureLinkedFieldDefinition(textField, buildFieldLinkIndexes([]), deps());

    expect(result).toMatchObject({ outcome: 'reused', definition: suffixedWinner });
  });

  it('rethrows non-conflict create errors', async () => {
    createDefinition.mockRejectedValue(new Error('boom'));

    await expect(
      ensureLinkedFieldDefinition(textField, buildFieldLinkIndexes([]), deps())
    ).rejects.toThrow('boom');
  });

  it('rethrows the conflict when the second conflict winner is not the same link', async () => {
    createDefinition.mockRejectedValue(conflictError());
    fetchDefinitionById.mockResolvedValue(makeDefinition({ legacyKey: 'some_other_key' }));

    await expect(
      ensureLinkedFieldDefinition(textField, buildFieldLinkIndexes([]), deps())
    ).rejects.toThrow(/conflict/i);
  });
});

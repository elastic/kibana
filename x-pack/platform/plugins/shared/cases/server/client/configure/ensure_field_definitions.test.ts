/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import { createFieldDefinitionsServiceMock } from '../../services/mocks';
import { deriveFieldDefinitionId } from '../../common/utils/field_definitions';
import { ensureGlobalFieldDefinitions } from './ensure_field_definitions';

describe('ensureGlobalFieldDefinitions', () => {
  const logger = loggingSystemMock.createLogger();
  const owner = 'securitySolutionFixture';
  const spaceId = 'default';

  // Legacy keys are uuid-ish opaque strings in real data; labels are human text.
  const textField = {
    key: 'text_key_1',
    label: 'My Text',
    type: CustomFieldTypes.TEXT,
    required: false,
  };

  const toggleField = {
    key: 'toggle_key_1',
    label: 'My Toggle',
    type: CustomFieldTypes.TOGGLE,
    required: true,
  };

  const makeDefinition = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
    fieldDefinitionId: 'existing-id',
    name: 'my_text',
    owner,
    definition: 'name: my_text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
    isGlobal: true,
    ...overrides,
  });

  const asSavedObject = (attributes: FieldDefinition, version = 'v1') => ({
    id: attributes.fieldDefinitionId,
    type: 'cases-field-definition',
    references: [],
    attributes,
    version,
  });

  let fieldDefinitionsService: ReturnType<typeof createFieldDefinitionsServiceMock>;

  const ensure = (customFields: unknown) =>
    ensureGlobalFieldDefinitions({
      owner,
      spaceId,
      customFields: customFields as Parameters<
        typeof ensureGlobalFieldDefinitions
      >[0]['customFields'],
      fieldDefinitionsService,
      logger,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    fieldDefinitionsService = createFieldDefinitionsServiceMock();
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue([]);
    // The create return value is ignored by ensureGlobalFieldDefinitions — the
    // locally-built attributes are authoritative — so the default mock suffices.
  });

  it.each([undefined, null, []])('returns immediately when customFields is %p', async (value) => {
    await ensure(value);

    expect(fieldDefinitionsService.getFieldDefinitionSavedObjects).not.toHaveBeenCalled();
    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
  });

  it('creates a linked definition with a friendly name, deterministic id, and legacyKey', async () => {
    await ensure([textField]);

    expect(fieldDefinitionsService.createFieldDefinition).toHaveBeenCalledTimes(1);
    const [input, serverManaged] = fieldDefinitionsService.createFieldDefinition.mock.calls[0];

    // Friendly, label-derived name — NOT the raw v1 key.
    expect(input).toMatchObject({
      name: 'my_text',
      owner,
      description: 'My Text',
      isGlobal: true,
    });
    expect(input.definition).toContain('name: my_text');

    expect(serverManaged).toEqual({
      id: deriveFieldDefinitionId({ spaceId, owner, name: 'my_text' }),
      legacyKey: 'text_key_1',
    });
  });

  it('reuses a definition linked via legacyKey without writing anything', async () => {
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue([
      asSavedObject(makeDefinition({ legacyKey: 'text_key_1' })),
    ] as never);

    await ensure([textField]);

    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
    expect(fieldDefinitionsService.setLegacyKey).not.toHaveBeenCalled();
  });

  it('reuses an exact-name match (pre-friendly-name definition) and repairs its legacyKey with OCC', async () => {
    // Definition named after the raw v1 key, no legacyKey yet.
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue([
      asSavedObject(
        makeDefinition({
          fieldDefinitionId: 'legacy-def',
          name: 'text_key_1',
          definition: 'name: text_key_1\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
        }),
        'so-version-7'
      ),
    ] as never);

    await ensure([textField]);

    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
    expect(fieldDefinitionsService.setLegacyKey).toHaveBeenCalledWith('legacy-def', 'text_key_1', {
      version: 'so-version-7',
    });
  });

  it('does not fail the configuration write when legacyKey repair loses its OCC race', async () => {
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue([
      asSavedObject(
        makeDefinition({
          fieldDefinitionId: 'legacy-def',
          name: 'text_key_1',
          definition: 'name: text_key_1\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
        })
      ),
    ] as never);
    fieldDefinitionsService.setLegacyKey.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError('cases-field-definition', 'legacy-def')
    );

    await expect(ensure([textField])).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Skipped legacyKey repair'));
  });

  it('reuses a non-global linked definition and warns instead of duplicating it', async () => {
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue([
      asSavedObject(makeDefinition({ legacyKey: 'text_key_1', isGlobal: false })),
    ] as never);

    await ensure([textField]);

    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('non-global'));
  });

  it('fails the configuration write when two definitions claim the same legacyKey', async () => {
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue([
      asSavedObject(
        makeDefinition({ fieldDefinitionId: 'a', name: 'one', legacyKey: 'text_key_1' })
      ),
      asSavedObject(
        makeDefinition({ fieldDefinitionId: 'b', name: 'two', legacyKey: 'text_key_1' })
      ),
    ] as never);

    await expect(ensure([textField])).rejects.toThrow(
      /"text_key_1" \(multiple field definitions claim this custom field key\)/
    );
    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
  });

  it('fails the configuration write when the linked definition has an incompatible type', async () => {
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue([
      asSavedObject(
        makeDefinition({
          legacyKey: 'text_key_1',
          definition: 'name: my_text\nlabel: My Text\ntype: integer\ncontrol: INPUT_NUMBER\n',
        })
      ),
    ] as never);

    await expect(ensure([textField])).rejects.toThrow(/incompatible type/);
  });

  it('fails the configuration write on an ambiguous normalized-name match', async () => {
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue([
      asSavedObject(
        makeDefinition({
          fieldDefinitionId: 'a',
          name: 'Text_Key_1',
          definition: 'name: Text_Key_1\nlabel: A\ntype: keyword\ncontrol: INPUT_TEXT\n',
        })
      ),
      asSavedObject(
        makeDefinition({
          fieldDefinitionId: 'b',
          name: 'TEXT_KEY_1',
          definition: 'name: TEXT_KEY_1\nlabel: B\ntype: keyword\ncontrol: INPUT_TEXT\n',
        })
      ),
    ] as never);

    await expect(ensure([textField])).rejects.toThrow(/ambiguously match/);
    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
  });

  it('fails the configuration write when the per-owner cap blocks a required creation', async () => {
    const existing = Array.from({ length: 200 }, (_, i) =>
      asSavedObject(
        makeDefinition({
          fieldDefinitionId: `fd-${i}`,
          name: `field_${i}`,
          definition: `name: field_${i}\nlabel: F\ntype: keyword\ncontrol: INPUT_TEXT\n`,
        })
      )
    );
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue(existing as never);

    await expect(ensure([textField])).rejects.toThrow(/maximum of 200 field definitions/);
    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
  });

  it('does not hit the cap check for fields that resolve to existing definitions', async () => {
    const existing = Array.from({ length: 199 }, (_, i) =>
      asSavedObject(
        makeDefinition({
          fieldDefinitionId: `fd-${i}`,
          name: `field_${i}`,
          definition: `name: field_${i}\nlabel: F\ntype: keyword\ncontrol: INPUT_TEXT\n`,
        })
      )
    );
    existing.push(asSavedObject(makeDefinition({ legacyKey: 'text_key_1' })));
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue(existing as never);

    // 200 existing but textField resolves — no creation needed, no capacity error.
    await expect(ensure([textField])).resolves.toBeUndefined();
  });

  it('creates exactly one SO when two customFields share the same key (intra-request dedup)', async () => {
    await ensure([textField, { ...textField }]);

    // The second entry resolves through the in-loop index update (legacyKey match).
    expect(fieldDefinitionsService.createFieldDefinition).toHaveBeenCalledTimes(1);
  });

  it('suffixes the friendly name when another definition already uses it', async () => {
    // Existing definition already owns the normalized name my_text and is linked elsewhere.
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue([
      asSavedObject(makeDefinition({ legacyKey: 'some_other_key' })),
    ] as never);

    await ensure([textField]);

    const [input] = fieldDefinitionsService.createFieldDefinition.mock.calls[0];
    expect(input.name).toMatch(/^my_text_[0-9a-f]{8}$/);
  });

  it('converges on a concurrent creator of the same link after a deterministic-id conflict', async () => {
    const deterministicId = deriveFieldDefinitionId({ spaceId, owner, name: 'my_text' });
    fieldDefinitionsService.createFieldDefinition.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createConflictError('cases-field-definition', deterministicId)
    );
    fieldDefinitionsService.getFieldDefinition.mockResolvedValue(
      asSavedObject(
        makeDefinition({ fieldDefinitionId: deterministicId, legacyKey: 'text_key_1' })
      ) as never
    );

    await expect(ensure([textField])).resolves.toBeUndefined();

    expect(fieldDefinitionsService.createFieldDefinition).toHaveBeenCalledTimes(1);
    expect(fieldDefinitionsService.getFieldDefinition).toHaveBeenCalledWith(deterministicId);
  });

  it('creates missing definitions and reuses resolved ones in one pass', async () => {
    fieldDefinitionsService.getFieldDefinitionSavedObjects.mockResolvedValue([
      asSavedObject(makeDefinition({ legacyKey: 'text_key_1' })),
    ] as never);

    await ensure([textField, toggleField]);

    expect(fieldDefinitionsService.createFieldDefinition).toHaveBeenCalledTimes(1);
    const [input, serverManaged] = fieldDefinitionsService.createFieldDefinition.mock.calls[0];
    expect(input).toMatchObject({ name: 'my_toggle', isGlobal: true });
    expect(serverManaged).toMatchObject({ legacyKey: 'toggle_key_1' });
  });
});

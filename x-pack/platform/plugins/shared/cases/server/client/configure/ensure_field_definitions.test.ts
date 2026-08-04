/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';
import { createFieldDefinitionsServiceMock } from '../../services/mocks';
import { ensureGlobalFieldDefinitions } from './ensure_field_definitions';

describe('ensureGlobalFieldDefinitions', () => {
  const logger = loggingSystemMock.createLogger();
  const owner = 'securitySolutionFixture';

  const textField = {
    key: 'my_text',
    label: 'My Text',
    type: CustomFieldTypes.TEXT,
    required: false,
  };

  const toggleField = {
    key: 'my_toggle',
    label: 'My Toggle',
    type: CustomFieldTypes.TOGGLE,
    required: true,
  };

  let fieldDefinitionsService: ReturnType<typeof createFieldDefinitionsServiceMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    fieldDefinitionsService = createFieldDefinitionsServiceMock();
  });

  it('returns immediately when customFields is undefined', async () => {
    await ensureGlobalFieldDefinitions({
      owner,
      customFields: undefined,
      fieldDefinitionsService,
      logger,
    });

    expect(fieldDefinitionsService.getFieldDefinitions).not.toHaveBeenCalled();
    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
  });

  it('returns immediately when customFields is null', async () => {
    await ensureGlobalFieldDefinitions({
      owner,
      customFields: null,
      fieldDefinitionsService,
      logger,
    });

    expect(fieldDefinitionsService.getFieldDefinitions).not.toHaveBeenCalled();
    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
  });

  it('returns immediately when customFields is an empty array', async () => {
    await ensureGlobalFieldDefinitions({
      owner,
      customFields: [],
      fieldDefinitionsService,
      logger,
    });

    expect(fieldDefinitionsService.getFieldDefinitions).not.toHaveBeenCalled();
    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
  });

  it('creates a global field definition for a new custom field', async () => {
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [],
      total: 0,
    });
    fieldDefinitionsService.createFieldDefinition.mockResolvedValue({} as never);

    await ensureGlobalFieldDefinitions({
      owner,
      customFields: [textField],
      fieldDefinitionsService,
      logger,
    });

    expect(fieldDefinitionsService.createFieldDefinition).toHaveBeenCalledTimes(1);
    const [call] = fieldDefinitionsService.createFieldDefinition.mock.calls;
    expect(call[0]).toMatchObject({
      name: 'my_text',
      owner,
      description: 'My Text',
      isGlobal: true,
    });
    // definition should be YAML and not contain a fieldDefinitionId (service generates it)
    expect(call[0].definition).toContain('name: my_text');
    expect(call[0]).not.toHaveProperty('fieldDefinitionId');
  });

  it('reuses an existing global field definition with the same name', async () => {
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [
        {
          fieldDefinitionId: 'existing-id',
          name: 'my_text',
          owner,
          definition: 'name: my_text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
          isGlobal: true,
        },
      ],
      total: 1,
    });

    await ensureGlobalFieldDefinitions({
      owner,
      customFields: [textField],
      fieldDefinitionsService,
      logger,
    });

    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
  });

  it('logs a warning when the existing definition has a control/type mismatch', async () => {
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [
        {
          fieldDefinitionId: 'existing-id',
          name: 'my_text',
          owner,
          // Mismatched: stored as integer/INPUT_NUMBER but the custom field is TEXT
          definition: 'name: my_text\nlabel: My Text\ntype: integer\ncontrol: INPUT_NUMBER\n',
          isGlobal: true,
        },
      ],
      total: 1,
    });

    await ensureGlobalFieldDefinitions({
      owner,
      customFields: [textField],
      fieldDefinitionsService,
      logger,
    });

    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('already exists but has'));
  });

  it('creates only the missing field definitions when some already exist', async () => {
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [
        {
          fieldDefinitionId: 'existing-id',
          name: 'my_text',
          owner,
          definition: 'name: my_text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
          isGlobal: true,
        },
      ],
      total: 1,
    });
    fieldDefinitionsService.createFieldDefinition.mockResolvedValue({} as never);

    await ensureGlobalFieldDefinitions({
      owner,
      customFields: [textField, toggleField],
      fieldDefinitionsService,
      logger,
    });

    expect(fieldDefinitionsService.createFieldDefinition).toHaveBeenCalledTimes(1);
    expect(fieldDefinitionsService.createFieldDefinition).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'my_toggle', isGlobal: true })
    );
  });

  it('logs an error and continues when createFieldDefinition fails for one field', async () => {
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [],
      total: 0,
    });

    fieldDefinitionsService.createFieldDefinition
      .mockRejectedValueOnce(new Error('SO write failed'))
      .mockResolvedValueOnce({} as never);

    await expect(
      ensureGlobalFieldDefinitions({
        owner,
        customFields: [textField, toggleField],
        fieldDefinitionsService,
        logger,
      })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('my_text'));
    // Both fields were attempted; the second one succeeded
    expect(fieldDefinitionsService.createFieldDefinition).toHaveBeenCalledTimes(2);
  });

  it('logs an error and does not throw when getFieldDefinitions fails', async () => {
    fieldDefinitionsService.getFieldDefinitions.mockRejectedValue(new Error('ES unavailable'));

    await expect(
      ensureGlobalFieldDefinitions({
        owner,
        customFields: [textField],
        fieldDefinitionsService,
        logger,
      })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES unavailable'));
    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
  });

  it('reads all field definitions (not only isGlobal: true) to detect non-global duplicates', async () => {
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [],
      total: 0,
    });
    fieldDefinitionsService.createFieldDefinition.mockResolvedValue({
      attributes: { name: 'my_text', owner, isGlobal: true },
    } as never);

    await ensureGlobalFieldDefinitions({
      owner,
      customFields: [textField],
      fieldDefinitionsService,
      logger,
    });

    // Must be called WITHOUT an isGlobal filter option
    expect(fieldDefinitionsService.getFieldDefinitions).toHaveBeenCalledWith(owner);
    expect(fieldDefinitionsService.getFieldDefinitions).not.toHaveBeenCalledWith(
      owner,
      expect.objectContaining({ isGlobal: true })
    );
  });

  it('skips create and warns when a non-global definition of the same name already exists', async () => {
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [
        {
          fieldDefinitionId: 'existing-id',
          name: 'my_text',
          owner,
          definition: 'name: my_text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
          isGlobal: false,
        },
      ],
      total: 1,
    });

    await ensureGlobalFieldDefinitions({
      owner,
      customFields: [textField],
      fieldDefinitionsService,
      logger,
    });

    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('non-global'));
  });

  it('reuses an existing definition when the existing name and custom field key differ only in case', async () => {
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [
        {
          fieldDefinitionId: 'existing-id',
          // Stored with uppercase first letter; custom field key is all-lowercase
          name: 'My_Text',
          owner,
          definition: 'name: My_Text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
          isGlobal: true,
        },
      ],
      total: 1,
    });

    await ensureGlobalFieldDefinitions({
      owner,
      // textField.key === 'my_text' (all lowercase)
      customFields: [textField],
      fieldDefinitionsService,
      logger,
    });

    // Case-insensitive match — no duplicate should be created.
    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
  });

  it('creates exactly one SO when two customFields share the same key (intra-request dedup)', async () => {
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [],
      total: 0,
    });
    fieldDefinitionsService.createFieldDefinition.mockResolvedValue({
      attributes: { name: 'my_text', owner, isGlobal: true },
    } as never);

    const duplicate = { ...textField }; // same key as textField

    await ensureGlobalFieldDefinitions({
      owner,
      customFields: [textField, duplicate],
      fieldDefinitionsService,
      logger,
    });

    // Second entry hits the index already populated by the first create.
    expect(fieldDefinitionsService.createFieldDefinition).toHaveBeenCalledTimes(1);
  });

  it('skips and warns when the per-owner cap is reached, without throwing', async () => {
    // The cap is 200 (MAX_FIELD_DEFINITIONS_PER_OWNER). Seed the service response
    // with exactly 200 existing definitions so the very next create must be blocked.
    const existingDefinitions = Array.from({ length: 200 }, (_, i) => ({
      fieldDefinitionId: `fd-${i}`,
      name: `field_${i}`,
      owner,
      definition: `name: field_${i}\ntype: keyword\ncontrol: INPUT_TEXT\n`,
      isGlobal: true,
    }));

    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: existingDefinitions,
      total: existingDefinitions.length,
    });

    await expect(
      ensureGlobalFieldDefinitions({
        owner,
        customFields: [textField, toggleField],
        fieldDefinitionsService,
        logger,
      })
    ).resolves.toBeUndefined();

    expect(fieldDefinitionsService.createFieldDefinition).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('maximum of 200 field definitions')
    );
  });
});

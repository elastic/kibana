/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { createCasesClientMockArgs } from '../mocks';
import { createFieldDefinitionsSubClient } from './client';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/v1';
import {
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  MAX_FIELD_DEFINITIONS_PER_OWNER,
} from '../../../common/constants';

const makeFieldDefinitionSO = (
  overrides: Partial<FieldDefinition> & { id?: string } = {}
): SavedObject<FieldDefinition> => {
  const { id = 'fd-1', ...attrs } = overrides;
  return {
    id,
    type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
    references: [],
    attributes: {
      fieldDefinitionId: id,
      name: 'my_field',
      owner: 'securitySolution' as const,
      definition: 'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\n',
      ...attrs,
    },
  };
};

describe('createFieldDefinitionsSubClient', () => {
  let clientArgs: ReturnType<typeof createCasesClientMockArgs>;
  let client: ReturnType<typeof createFieldDefinitionsSubClient>;

  beforeEach(() => {
    clientArgs = createCasesClientMockArgs();
    client = createFieldDefinitionsSubClient(clientArgs);
    clientArgs.authorization.ensureAuthorized.mockResolvedValue();
  });

  describe('getFieldDefinitions', () => {
    it('throws 400 when no owner is provided', async () => {
      await expect(client.getFieldDefinitions({})).rejects.toThrow('owner is required');
      expect(clientArgs.authorization.ensureAuthorized).not.toHaveBeenCalled();
      expect(
        clientArgs.services.fieldDefinitionsService.getFieldDefinitions
      ).not.toHaveBeenCalled();
    });

    it('returns field definitions for a valid owner', async () => {
      const so = makeFieldDefinitionSO();
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [so.attributes],
        total: 1,
      });

      const result = await client.getFieldDefinitions({ owner: 'securitySolution' });

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalled();
      expect(result.fieldDefinitions).toHaveLength(1);
    });

    it('forwards isGlobal to fieldDefinitionsService', async () => {
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [],
        total: 0,
      });

      await client.getFieldDefinitions({ owner: 'securitySolution', isGlobal: true });

      expect(clientArgs.services.fieldDefinitionsService.getFieldDefinitions).toHaveBeenCalledWith(
        ['securitySolution'],
        { isGlobal: true }
      );
    });
  });

  describe('createFieldDefinition', () => {
    const input = {
      name: 'my_field',
      owner: 'securitySolution' as const,
      definition: 'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\n',
    };

    it('creates a field definition when no name conflict exists', async () => {
      const so = makeFieldDefinitionSO();
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [],
        total: 0,
      });
      clientArgs.services.fieldDefinitionsService.createFieldDefinition.mockResolvedValue(so);

      const result = await client.createFieldDefinition(input);

      expect(result).toBe(so);
      expect(
        clientArgs.services.fieldDefinitionsService.createFieldDefinition
      ).toHaveBeenCalledWith(input);
    });

    it('throws 400 when the owner already has the maximum number of field definitions', async () => {
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: Array(MAX_FIELD_DEFINITIONS_PER_OWNER).fill(
          makeFieldDefinitionSO().attributes
        ),
        total: MAX_FIELD_DEFINITIONS_PER_OWNER,
      });

      await expect(client.createFieldDefinition(input)).rejects.toThrow(
        `Cannot create more than ${MAX_FIELD_DEFINITIONS_PER_OWNER} field definitions per owner.`
      );
      expect(
        clientArgs.services.fieldDefinitionsService.createFieldDefinition
      ).not.toHaveBeenCalled();
    });

    it('throws 409 when a field with the same name already exists', async () => {
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [makeFieldDefinitionSO().attributes],
        total: 1,
      });

      await expect(client.createFieldDefinition(input)).rejects.toThrow(
        'A field definition with name "my_field" already exists for this owner.'
      );
    });

    it('is case-insensitive when checking for name conflicts', async () => {
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [makeFieldDefinitionSO({ name: 'MY_FIELD' }).attributes],
        total: 1,
      });

      await expect(client.createFieldDefinition({ ...input, name: 'my_field' })).rejects.toThrow(
        'A field definition with name "MY_FIELD" already exists for this owner.'
      );
    });

    it('throws 400 when the name attribute does not match the YAML name', async () => {
      // FAILURE SCENARIO: caller submits name "other_field" while the YAML says
      // "my_field" — the two would diverge forever since both become immutable.
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [],
        total: 0,
      });

      await expect(client.createFieldDefinition({ ...input, name: 'other_field' })).rejects.toThrow(
        'The name attribute ("other_field") must match the name in the YAML definition ("my_field").'
      );
      expect(
        clientArgs.services.fieldDefinitionsService.createFieldDefinition
      ).not.toHaveBeenCalled();
    });

    it('defers malformed YAML to service validation instead of the name-match check', async () => {
      const so = makeFieldDefinitionSO();
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [],
        total: 0,
      });
      clientArgs.services.fieldDefinitionsService.createFieldDefinition.mockResolvedValue(so);

      await client.createFieldDefinition({ ...input, definition: 'not: [valid' });

      expect(clientArgs.services.fieldDefinitionsService.createFieldDefinition).toHaveBeenCalled();
    });
  });

  describe('updateFieldDefinition', () => {
    const input = {
      name: 'my_field',
      owner: 'securitySolution' as const,
      definition: 'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\n',
    };

    const expectIdentityConflict = async (
      updateInput: typeof input,
      changed: Array<'name' | 'type'>
    ) => {
      await expect(client.updateFieldDefinition('fd-1', updateInput)).rejects.toMatchObject({
        output: { statusCode: 409 },
        data: {
          casesApiErrorAttributes: { code: 'field_identity_immutable', changed },
        },
      });
      expect(
        clientArgs.services.fieldDefinitionsService.updateFieldDefinition
      ).not.toHaveBeenCalled();
    };

    beforeEach(() => {
      const so = makeFieldDefinitionSO();
      clientArgs.services.fieldDefinitionsService.getFieldDefinition.mockResolvedValue(so);
      clientArgs.services.fieldDefinitionsService.updateFieldDefinition.mockResolvedValue(so);
    });

    it('updates metadata without changing identity', async () => {
      const result = await client.updateFieldDefinition('fd-1', {
        ...input,
        description: 'new description',
        definition: 'name: my_field\nlabel: "New Label"\ncontrol: INPUT_TEXT\ntype: keyword\n',
      });

      expect(result.attributes.name).toBe('my_field');
      expect(clientArgs.services.fieldDefinitionsService.updateFieldDefinition).toHaveBeenCalled();
    });

    it('does not run a name-uniqueness lookup on update', async () => {
      await client.updateFieldDefinition('fd-1', input);

      expect(
        clientArgs.services.fieldDefinitionsService.getFieldDefinitions
      ).not.toHaveBeenCalled();
    });

    it('throws a structured 409 when the name changes', async () => {
      // FAILURE SCENARIO: renaming my_field -> new_name would orphan every case
      // value stored under my_field_as_keyword and break analytics.
      await expectIdentityConflict(
        {
          ...input,
          name: 'new_name',
          definition: 'name: new_name\ncontrol: INPUT_TEXT\ntype: keyword\n',
        },
        ['name']
      );
    });

    it('throws a structured 409 when the type changes', async () => {
      // FAILURE SCENARIO: retyping keyword -> integer changes the storage key
      // suffix (_as_keyword -> _as_integer), stranding existing values.
      await expectIdentityConflict(
        {
          ...input,
          definition: 'name: my_field\ncontrol: INPUT_NUMBER\ntype: integer\n',
        },
        ['type']
      );
    });

    it('throws a structured 409 listing both when name and type change', async () => {
      await expectIdentityConflict(
        {
          ...input,
          name: 'new_name',
          definition: 'name: new_name\ncontrol: INPUT_NUMBER\ntype: integer\n',
        },
        ['name', 'type']
      );
    });

    it('throws 400 when the name attribute does not match the YAML name', async () => {
      // FAILURE SCENARIO: attribute says my_field but YAML says other_field —
      // malformed input, rejected before any identity comparison.
      await expect(
        client.updateFieldDefinition('fd-1', {
          ...input,
          definition: 'name: other_field\ncontrol: INPUT_TEXT\ntype: keyword\n',
        })
      ).rejects.toThrow(
        'The name attribute ("my_field") must match the name in the YAML definition ("other_field").'
      );
      expect(
        clientArgs.services.fieldDefinitionsService.updateFieldDefinition
      ).not.toHaveBeenCalled();
    });

    it('increments identity rejection counters for the changed parts', async () => {
      const usageCounter = { domainId: 'cases', incrementCounter: jest.fn() };
      client = createFieldDefinitionsSubClient({ ...clientArgs, usageCounter });

      await expect(
        client.updateFieldDefinition('fd-1', {
          ...input,
          name: 'new_name',
          definition: 'name: new_name\ncontrol: INPUT_NUMBER\ntype: integer\n',
        })
      ).rejects.toMatchObject({ output: { statusCode: 409 } });

      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'fieldIdentityImmutableName',
      });
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'fieldIdentityImmutableType',
      });
    });

    it('still returns the 409 when the usage counter throws', async () => {
      // FAILURE SCENARIO: telemetry backend hiccup — the counter throwing must
      // not mask or replace the structured identity conflict.
      const usageCounter = {
        domainId: 'cases',
        incrementCounter: jest.fn().mockImplementation(() => {
          throw new Error('counter unavailable');
        }),
      };
      client = createFieldDefinitionsSubClient({ ...clientArgs, usageCounter });

      await expect(
        client.updateFieldDefinition('fd-1', {
          ...input,
          name: 'new_name',
          definition: 'name: new_name\ncontrol: INPUT_TEXT\ntype: keyword\n',
        })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
        data: {
          casesApiErrorAttributes: { code: 'field_identity_immutable', changed: ['name'] },
        },
      });
    });

    it('skips the type check when the persisted YAML is malformed but still guards the name', async () => {
      // Imported/legacy SO whose stored YAML no longer parses: the type cannot
      // be determined, but a rename is still an identity change.
      clientArgs.services.fieldDefinitionsService.getFieldDefinition.mockResolvedValue(
        makeFieldDefinitionSO({ definition: 'not: [valid' })
      );

      await expectIdentityConflict(
        {
          ...input,
          name: 'new_name',
          definition: 'name: new_name\ncontrol: INPUT_TEXT\ntype: keyword\n',
        },
        ['name']
      );
    });

    it('defers malformed submitted YAML to service validation', async () => {
      await client.updateFieldDefinition('fd-1', { ...input, definition: 'not: [valid' });

      expect(
        clientArgs.services.fieldDefinitionsService.updateFieldDefinition
      ).toHaveBeenCalledWith('fd-1', { ...input, definition: 'not: [valid' });
    });
  });

  describe('deleteFieldDefinition', () => {
    it('deletes the field definition when no active templates reference it', async () => {
      const so = makeFieldDefinitionSO();
      clientArgs.services.fieldDefinitionsService.getFieldDefinition.mockResolvedValue(so);
      clientArgs.services.templatesService.getActiveTemplatesReferencingField.mockResolvedValue([]);

      await client.deleteFieldDefinition('fd-1');

      expect(
        clientArgs.services.fieldDefinitionsService.deleteFieldDefinition
      ).toHaveBeenCalledWith('fd-1');
    });

    it('throws 409 when a single template references the field', async () => {
      // FAILURE SCENARIO: user tries to delete "my_field" while "Incident Template" has $ref: my_field
      const so = makeFieldDefinitionSO();
      clientArgs.services.fieldDefinitionsService.getFieldDefinition.mockResolvedValue(so);
      clientArgs.services.templatesService.getActiveTemplatesReferencingField.mockResolvedValue([
        { name: 'Incident Template' },
      ]);

      await expect(client.deleteFieldDefinition('fd-1')).rejects.toThrow(
        'Cannot delete field definition "my_field": it is referenced by 1 active template(s): "Incident Template"'
      );
      expect(
        clientArgs.services.fieldDefinitionsService.deleteFieldDefinition
      ).not.toHaveBeenCalled();
    });

    it('throws 409 listing all referencing templates when multiple templates reference the field', async () => {
      // FAILURE SCENARIO: two templates both reference the field — error message lists all names
      const so = makeFieldDefinitionSO();
      clientArgs.services.fieldDefinitionsService.getFieldDefinition.mockResolvedValue(so);
      clientArgs.services.templatesService.getActiveTemplatesReferencingField.mockResolvedValue([
        { name: 'Template A' },
        { name: 'Template B' },
      ]);

      await expect(client.deleteFieldDefinition('fd-1')).rejects.toThrow(
        'Cannot delete field definition "my_field": it is referenced by 2 active template(s): "Template A", "Template B"'
      );
      expect(
        clientArgs.services.fieldDefinitionsService.deleteFieldDefinition
      ).not.toHaveBeenCalled();
    });

    it('passes the field owner and name to the templates reference check', async () => {
      const so = makeFieldDefinitionSO({ name: 'priority', owner: 'securitySolution' });
      clientArgs.services.fieldDefinitionsService.getFieldDefinition.mockResolvedValue(so);
      clientArgs.services.templatesService.getActiveTemplatesReferencingField.mockResolvedValue([]);

      await client.deleteFieldDefinition('fd-1');

      expect(
        clientArgs.services.templatesService.getActiveTemplatesReferencingField
      ).toHaveBeenCalledWith('securitySolution', 'priority');
    });
  });
});

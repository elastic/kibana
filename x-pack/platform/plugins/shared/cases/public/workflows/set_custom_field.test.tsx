/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setCustomFieldStepDefinition } from './set_custom_field';
import { getCaseConfigure } from '../containers/configure/api';
import type { CasesConfigurationUI } from '../../common/ui';

jest.mock('../containers/configure/api', () => ({
  getCaseConfigure: jest.fn(),
}));

describe('createSetCustomFieldStepDefinition', () => {
  const getCaseConfigureMock = jest.mocked(getCaseConfigure);

  const setup = () => {
    interface SelectionHandler {
      search: (input: string, context: unknown) => Promise<unknown>;
      resolve: (value: string, context: unknown) => Promise<unknown>;
      getDetails: (
        value: string,
        context: unknown,
        option: unknown
      ) => Promise<{ message: string }>;
    }

    getCaseConfigureMock.mockResolvedValue([
      {
        owner: 'securitySolution',
        customFields: [
          {
            key: 'priority_reason',
            label: 'Priority reason',
            type: 'text',
            required: false,
            defaultValue: null,
          },
          {
            key: 'is_automated',
            label: 'Is automated',
            type: 'toggle',
            required: false,
            defaultValue: false,
          },
        ],
      },
      {
        owner: 'observability',
        customFields: [
          {
            key: 'service_name',
            label: 'Service name',
            type: 'text',
            required: false,
            defaultValue: null,
          },
        ],
      },
    ] as CasesConfigurationUI[]);

    const definition = setCustomFieldStepDefinition;
    const inputHandlers = (definition.editorHandlers?.input ?? {}) as Record<
      string,
      { selection?: SelectionHandler }
    >;

    return {
      definition,
      fieldNameSelection: inputHandlers.field_name?.selection,
    };
  };

  it('returns a public step definition with expected metadata', () => {
    const { definition } = setup();

    expect(definition.id).toBe('cases.setCustomField');
    expect(definition.category).toBe('kibana.cases');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });

  it('searches and resolves custom field options using case configuration API', async () => {
    const { fieldNameSelection } = setup();

    const searchResults = await fieldNameSelection!.search('priority', {
      stepType: 'cases.setCustomField',
      scope: 'input',
      propertyKey: 'field_name',
    });
    const resolved = await fieldNameSelection!.resolve('priority_reason', {
      stepType: 'cases.setCustomField',
      scope: 'input',
      propertyKey: 'field_name',
    });

    expect(getCaseConfigureMock).toHaveBeenCalledTimes(2);
    expect(searchResults).toEqual([
      {
        value: 'priority_reason',
        label: 'Priority reason',
        description: 'text',
      },
    ]);
    expect(resolved).toEqual({
      value: 'priority_reason',
      label: 'Priority reason',
      description: 'text',
    });
  });

  it('returns all owner fields for empty search query', async () => {
    const { fieldNameSelection } = setup();

    await expect(
      fieldNameSelection!.search('   ', {
        stepType: 'cases.setCustomField',
        scope: 'input',
        propertyKey: 'field_name',
      })
    ).resolves.toEqual([
      {
        value: 'priority_reason',
        label: 'Priority reason',
        description: 'text',
      },
      {
        value: 'is_automated',
        label: 'Is automated',
        description: 'toggle',
      },
    ]);
  });

  it('filters custom fields by workflow owner', async () => {
    const { fieldNameSelection } = setup();

    await expect(
      fieldNameSelection!.search('service', {
        stepType: 'cases.setCustomField',
        scope: 'input',
        propertyKey: 'field_name',
      })
    ).resolves.toEqual([]);
  });

  it('returns details message for resolved and unresolved custom field values', async () => {
    const { fieldNameSelection } = setup();

    const resolvedDetails = await fieldNameSelection!.getDetails(
      'priority_reason',
      { stepType: 'cases.setCustomField', scope: 'input', propertyKey: 'field_name' },
      { value: 'priority_reason', label: 'Priority reason' }
    );
    const unresolvedDetails = await fieldNameSelection!.getDetails(
      'unknown_key',
      { stepType: 'cases.setCustomField', scope: 'input', propertyKey: 'field_name' },
      null
    );

    expect(resolvedDetails.message).toContain('can be updated');
    expect(unresolvedDetails.message).toContain('was not found');
  });

  it('propagates API errors from getCaseConfigure', async () => {
    const error = new Error('configure fetch failed');
    const { fieldNameSelection } = setup();
    getCaseConfigureMock.mockRejectedValueOnce(error);

    await expect(
      fieldNameSelection!.search('priority', {
        stepType: 'cases.setCustomField',
        scope: 'input',
        propertyKey: 'field_name',
      })
    ).rejects.toThrow(error.message);
  });

  beforeEach(() => {
    getCaseConfigureMock.mockReset();
  });
});

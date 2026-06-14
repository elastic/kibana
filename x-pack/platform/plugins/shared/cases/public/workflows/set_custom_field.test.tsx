/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows';
import { setCustomFieldStepDefinition } from './set_custom_field';
import { getCaseConfigure } from '../containers/configure/api';
import type { Owner } from '../../common/bundled-types.gen';
import type { CasesConfigurationUI } from '../../common/ui';

jest.mock('../containers/configure/api', () => ({
  getCaseConfigure: jest.fn(),
}));

describe('setCustomFieldStepDefinition', () => {
  const getCaseConfigureMock = jest.mocked(getCaseConfigure);

  const createSelectionContext = (owner?: Owner | string) => ({
    stepType: 'cases.setCustomField' as const,
    scope: 'input' as const,
    propertyKey: 'field_name',
    values: {
      input: owner === undefined ? {} : { owner },
    },
  });

  const defaultCasesConfigure: CasesConfigurationUI[] = [
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
  ] as unknown as CasesConfigurationUI[];

  const setup = (casesConfigure: CasesConfigurationUI[] = defaultCasesConfigure) => {
    interface SelectionHandler {
      search: (input: string, context: unknown) => Promise<SelectionOption<string>[]>;
      resolve: (value: string, context: unknown) => Promise<SelectionOption | null>;
      getDetails: (
        value: string,
        context: unknown,
        option: unknown
      ) => Promise<{ message: string }>;
    }

    getCaseConfigureMock.mockResolvedValue(casesConfigure);

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

    const searchResults = await fieldNameSelection!.search(
      'priority',
      createSelectionContext('securitySolution')
    );
    const resolved = await fieldNameSelection!.resolve(
      'priority_reason',
      createSelectionContext('securitySolution')
    );

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

  it('returns all custom fields for the owner when the search query is empty', async () => {
    const { fieldNameSelection } = setup();

    await expect(
      fieldNameSelection!.search('   ', createSelectionContext('securitySolution'))
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
    expect(getCaseConfigureMock).toHaveBeenCalledTimes(1);
  });

  it('returns at most 15 custom fields when the search query is empty', async () => {
    const manyCustomFields = Array.from({ length: 16 }, (_, index) => ({
      key: `cf_${index}`,
      label: `Field ${index}`,
      type: 'text' as const,
      required: false,
      defaultValue: null,
    }));

    const { fieldNameSelection } = setup([
      {
        owner: 'securitySolution',
        customFields: manyCustomFields,
      },
    ] as CasesConfigurationUI[]);

    const searchResults = await fieldNameSelection!.search(
      '',
      createSelectionContext('securitySolution')
    );

    expect(searchResults).toHaveLength(15);
    expect(searchResults[0]).toEqual({
      value: 'cf_0',
      label: 'Field 0',
      description: 'text',
    });
    expect(searchResults[14]).toEqual({
      value: 'cf_14',
      label: 'Field 14',
      description: 'text',
    });
  });

  it('finds a custom field beyond the first 15 when the search query is non-empty', async () => {
    const manyCustomFields = [
      ...Array.from({ length: 15 }, (_, index) => ({
        key: `no_match_${index}`,
        label: `Plain ${index}`,
        type: 'text' as const,
        required: false,
        defaultValue: null,
      })),
      {
        key: 'only_uniquetail_field',
        label: 'Only uniquetail field',
        type: 'text' as const,
        required: false,
        defaultValue: null,
      },
    ];

    const { fieldNameSelection } = setup([
      {
        owner: 'securitySolution',
        customFields: manyCustomFields,
      },
    ] as CasesConfigurationUI[]);

    const searchResults = await fieldNameSelection!.search(
      'uniquetail',
      createSelectionContext('securitySolution')
    );

    expect(searchResults).toEqual([
      {
        value: 'only_uniquetail_field',
        label: 'Only uniquetail field',
        description: 'text',
      },
    ]);
  });

  it('returns no options when input owner is invalid', async () => {
    const { fieldNameSelection } = setup();

    await expect(
      fieldNameSelection!.search('priority', createSelectionContext('notAValidOwner'))
    ).resolves.toEqual([]);
    expect(getCaseConfigureMock).not.toHaveBeenCalled();
  });

  it('returns no options when input owner is empty', async () => {
    const { fieldNameSelection } = setup();

    await expect(
      fieldNameSelection!.search('priority', createSelectionContext(''))
    ).resolves.toEqual([]);
    await expect(fieldNameSelection!.search('priority', createSelectionContext())).resolves.toEqual(
      []
    );
    expect(getCaseConfigureMock).not.toHaveBeenCalled();
  });

  it('does not return observability custom fields when input owner is security', async () => {
    const { fieldNameSelection } = setup();

    await expect(
      fieldNameSelection!.search('service', createSelectionContext('securitySolution'))
    ).resolves.toEqual([]);
  });

  it('returns security custom fields when input owner is securitySolution', async () => {
    const { fieldNameSelection } = setup();

    const searchResults = await fieldNameSelection!.search(
      'automated',
      createSelectionContext('securitySolution')
    );

    expect(searchResults).toEqual([
      {
        value: 'is_automated',
        label: 'Is automated',
        description: 'toggle',
      },
    ]);
  });

  it('returns observability custom fields when input owner is observability', async () => {
    const { fieldNameSelection } = setup();

    const searchResults = await fieldNameSelection!.search(
      'service',
      createSelectionContext('observability')
    );
    const resolved = await fieldNameSelection!.resolve(
      'service_name',
      createSelectionContext('observability')
    );

    expect(searchResults).toEqual([
      {
        value: 'service_name',
        label: 'Service name',
        description: 'text',
      },
    ]);
    expect(resolved).toEqual({
      value: 'service_name',
      label: 'Service name',
      description: 'text',
    });
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
      fieldNameSelection!.search('priority', createSelectionContext('securitySolution'))
    ).rejects.toThrow(error.message);
  });

  afterEach(() => {
    getCaseConfigureMock.mockReset();
  });
});

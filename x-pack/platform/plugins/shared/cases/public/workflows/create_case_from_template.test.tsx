/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows';
import { createCreateCaseFromTemplateStepDefinition } from './create_case_from_template';
import { getCaseConfigure } from '../containers/configure/api';
import type { Owner } from '../../common/bundled-types.gen';
import type { CasesConfigurationUI } from '../../common/ui';

jest.mock('../containers/configure/api', () => ({
  getCaseConfigure: jest.fn(),
}));

describe('createCreateCaseFromTemplateStepDefinition', () => {
  const getCaseConfigureMock = jest.mocked(getCaseConfigure);

  const createSelectionContext = (owner?: Owner | string) => ({
    stepType: 'cases.createCaseFromTemplate' as const,
    scope: 'input' as const,
    propertyKey: 'case_template_id',
    values: {
      input: owner === undefined ? {} : { owner },
    },
  });

  const defaultCasesConfigure: CasesConfigurationUI[] = [
    {
      owner: 'securitySolution',
      templates: [
        {
          key: 'triage_template',
          name: 'Triage template',
          description: 'Default triage template',
          caseFields: { title: 'Template title' },
        },
        {
          key: 'investigation_template',
          name: 'Investigation template',
          description: 'Investigation defaults',
          caseFields: { title: 'Investigation title' },
        },
      ],
    },
    {
      owner: 'observability',
      templates: [
        {
          key: 'observability_template',
          name: 'Observability template',
          description: 'Observability defaults',
          caseFields: { title: 'Observability title' },
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

    const definition = createCreateCaseFromTemplateStepDefinition;
    const inputHandlers = (definition.editorHandlers?.input ?? {}) as Record<
      string,
      { selection?: SelectionHandler }
    >;

    return {
      definition,
      templateSelection: inputHandlers.case_template_id.selection,
    };
  };

  it('returns a public step definition with expected metadata', () => {
    const { definition } = setup();

    expect(definition.id).toBe('cases.createCaseFromTemplate');
    expect(definition.category).toBe('kibana.cases');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });

  it('searches and resolves template options using case configuration API', async () => {
    const { templateSelection } = setup();

    const searchResults = await templateSelection!.search(
      'template',
      createSelectionContext('securitySolution')
    );
    const resolved = await templateSelection!.resolve(
      'triage_template',
      createSelectionContext('securitySolution')
    );

    expect(getCaseConfigureMock).toHaveBeenCalledTimes(2);
    expect(searchResults).toEqual([
      {
        value: 'triage_template',
        label: 'Triage template',
        description: 'Default triage template',
      },
      {
        value: 'investigation_template',
        label: 'Investigation template',
        description: 'Investigation defaults',
      },
    ]);
    expect(resolved).toEqual({
      value: 'triage_template',
      label: 'Triage template',
      description: 'Default triage template',
    });
  });

  it('returns all templates for the owner when the search query is empty', async () => {
    const { templateSelection } = setup();

    await expect(
      templateSelection!.search('   ', createSelectionContext('securitySolution'))
    ).resolves.toEqual([
      {
        value: 'triage_template',
        label: 'Triage template',
        description: 'Default triage template',
      },
      {
        value: 'investigation_template',
        label: 'Investigation template',
        description: 'Investigation defaults',
      },
    ]);
    expect(getCaseConfigureMock).toHaveBeenCalledTimes(1);
  });

  it('returns at most 15 templates when the search query is empty', async () => {
    const manyTemplates = Array.from({ length: 16 }, (_, index) => ({
      key: `template_${index}`,
      name: `Template ${index}`,
      description: `Description ${index}`,
      caseFields: { title: `Title ${index}` },
    }));

    const { templateSelection } = setup([
      {
        owner: 'securitySolution',
        templates: manyTemplates,
      },
    ] as CasesConfigurationUI[]);

    const searchResults = await templateSelection!.search(
      '',
      createSelectionContext('securitySolution')
    );

    expect(searchResults).toHaveLength(15);
    expect(searchResults[0]).toEqual({
      value: 'template_0',
      label: 'Template 0',
      description: 'Description 0',
    });
    expect(searchResults[14]).toEqual({
      value: 'template_14',
      label: 'Template 14',
      description: 'Description 14',
    });
  });

  it('finds a template beyond the first 15 when the search query is non-empty', async () => {
    const manyTemplates = [
      ...Array.from({ length: 15 }, (_, index) => ({
        key: `tmpl_${index}`,
        name: `Plain ${index}`,
        description: '',
        caseFields: { title: `T ${index}` },
      })),
      {
        key: 'only_uniquetail',
        name: 'Only uniquetail template',
        description: 'Last',
        caseFields: { title: 'X' },
      },
    ];

    const { templateSelection } = setup([
      {
        owner: 'securitySolution',
        templates: manyTemplates,
      },
    ] as CasesConfigurationUI[]);

    const searchResults = await templateSelection!.search(
      'uniquetail',
      createSelectionContext('securitySolution')
    );

    expect(searchResults).toEqual([
      {
        value: 'only_uniquetail',
        label: 'Only uniquetail template',
        description: 'Last',
      },
    ]);
  });

  it('returns no options when input owner is invalid', async () => {
    const { templateSelection } = setup();

    await expect(
      templateSelection!.search('triage', createSelectionContext('notAValidOwner'))
    ).resolves.toEqual([]);
    expect(getCaseConfigureMock).not.toHaveBeenCalled();
  });

  it('returns no options when input owner is empty', async () => {
    const { templateSelection } = setup();

    await expect(templateSelection!.search('triage', createSelectionContext(''))).resolves.toEqual(
      []
    );
    await expect(templateSelection!.search('triage', createSelectionContext())).resolves.toEqual(
      []
    );
    expect(getCaseConfigureMock).not.toHaveBeenCalled();
  });

  it('does not return observability templates when input owner is security', async () => {
    const { templateSelection } = setup();

    await expect(
      templateSelection!.search('observability', createSelectionContext('securitySolution'))
    ).resolves.toEqual([]);
  });

  it('returns security templates when input owner is securitySolution', async () => {
    const { templateSelection } = setup();

    const searchResults = await templateSelection!.search(
      'investigation',
      createSelectionContext('securitySolution')
    );

    expect(searchResults).toEqual([
      {
        value: 'investigation_template',
        label: 'Investigation template',
        description: 'Investigation defaults',
      },
    ]);
  });

  it('returns observability templates when input owner is observability', async () => {
    const { templateSelection } = setup();

    const searchResults = await templateSelection!.search(
      'observability',
      createSelectionContext('observability')
    );
    const resolved = await templateSelection!.resolve(
      'observability_template',
      createSelectionContext('observability')
    );

    expect(searchResults).toEqual([
      {
        value: 'observability_template',
        label: 'Observability template',
        description: 'Observability defaults',
      },
    ]);
    expect(resolved).toEqual({
      value: 'observability_template',
      label: 'Observability template',
      description: 'Observability defaults',
    });
  });

  it('returns details message for resolved and unresolved template values', async () => {
    const { templateSelection } = setup();

    const resolvedDetails = await templateSelection!.getDetails(
      'triage_template',
      { stepType: 'cases.createCaseFromTemplate', scope: 'input', propertyKey: 'case_template_id' },
      { value: 'triage_template', label: 'Triage template' }
    );
    const unresolvedDetails = await templateSelection!.getDetails(
      'missing_template',
      { stepType: 'cases.createCaseFromTemplate', scope: 'input', propertyKey: 'case_template_id' },
      null
    );

    expect(resolvedDetails.message).toContain('can be used');
    expect(unresolvedDetails.message).toContain('was not found');
  });

  it('propagates API errors from getCaseConfigure', async () => {
    const error = new Error('configure fetch failed');
    const { templateSelection } = setup();
    getCaseConfigureMock.mockRejectedValueOnce(error);

    await expect(
      templateSelection!.search('triage', createSelectionContext('securitySolution'))
    ).rejects.toThrow(error.message);
  });

  afterEach(() => {
    getCaseConfigureMock.mockReset();
  });
});

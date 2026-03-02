/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCreateCaseFromTemplateStepDefinition } from './create_case_from_template';
import { getCaseConfigure } from '../containers/configure/api';
import type { CasesConfigurationUI } from '../../common/ui';

jest.mock('../containers/configure/api', () => ({
  getCaseConfigure: jest.fn(),
}));

describe('createCreateCaseFromTemplateStepDefinition', () => {
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
            description: 'Should not be shown for workflow owner',
            caseFields: { title: 'Observability title' },
          },
        ],
      },
    ] as CasesConfigurationUI[]);

    const definition = createCreateCaseFromTemplateStepDefinition();
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
    expect(definition.actionsMenuGroup).toBe('kibana');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });

  it('searches and resolves template options using case configuration API', async () => {
    const { templateSelection } = setup();

    const searchResults = await templateSelection!.search('triage', {
      stepType: 'cases.createCaseFromTemplate',
      scope: 'input',
      propertyKey: 'case_template_id',
    });
    const resolved = await templateSelection!.resolve('triage_template', {
      stepType: 'cases.createCaseFromTemplate',
      scope: 'input',
      propertyKey: 'case_template_id',
    });

    expect(getCaseConfigureMock).toHaveBeenCalledTimes(2);
    expect(searchResults).toEqual([
      {
        value: 'triage_template',
        label: 'Triage template',
        description: 'Default triage template',
      },
    ]);
    expect(resolved).toEqual({
      value: 'triage_template',
      label: 'Triage template',
      description: 'Default triage template',
    });
  });

  it('returns no options for empty search query', async () => {
    const { templateSelection } = setup();

    await expect(
      templateSelection!.search('   ', {
        stepType: 'cases.createCaseFromTemplate',
        scope: 'input',
        propertyKey: 'case_template_id',
      })
    ).resolves.toEqual([]);
  });

  it('filters templates by workflow owner', async () => {
    const { templateSelection } = setup();

    await expect(
      templateSelection!.search('observability', {
        stepType: 'cases.createCaseFromTemplate',
        scope: 'input',
        propertyKey: 'case_template_id',
      })
    ).resolves.toEqual([]);
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
      templateSelection!.search('triage', {
        stepType: 'cases.createCaseFromTemplate',
        scope: 'input',
        propertyKey: 'case_template_id',
      })
    ).rejects.toThrow(error.message);
  });

  afterEach(() => {
    getCaseConfigureMock.mockReset();
  });
});

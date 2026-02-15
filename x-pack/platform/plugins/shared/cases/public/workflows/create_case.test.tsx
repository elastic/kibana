/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, HttpStart } from '@kbn/core/public';
import { createCreateCaseStepDefinition } from './create_case';

describe('createCreateCaseStepDefinition', () => {
  const connectors = [
    { id: 'none', name: 'No connector', actionTypeId: '.none', type: '.none' },
    { id: 'jira-1', name: 'Jira Connector', actionTypeId: '.jira', type: '.jira' },
  ];
  const tags = ['security', 'incident'];
  const configurations = [
    {
      owner: 'securitySolution',
      templates: [
        {
          key: 'triage_template',
          name: 'Triage template',
          description: 'Default triage template',
          caseFields: { category: 'Security' },
        },
      ],
      customFields: [
        { key: 'priority_level', label: 'Priority level', type: 'text', required: true },
        { key: 'is_urgent', label: 'Is urgent', type: 'toggle', required: false },
      ],
    },
  ];

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

    const http = {
      get: jest.fn((url: string) => {
        if (url === '/api/cases/configure') {
          return Promise.resolve(configurations);
        }
        if (url === '/api/cases/tags') {
          return Promise.resolve(tags);
        }
        return Promise.resolve(connectors);
      }),
    } as unknown as jest.Mocked<HttpStart>;

    const core = {
      getStartServices: jest.fn().mockResolvedValue([{ http }, {}, {}]),
    } as unknown as jest.Mocked<CoreSetup>;

    const definition = createCreateCaseStepDefinition(core);
    const inputHandlers = (definition.editorHandlers?.input ?? {}) as Record<
      string,
      { selection?: SelectionHandler }
    >;
    const connectorSelection = inputHandlers['connector.id']?.selection;
    const connectorNameSelection = inputHandlers['connector.name']?.selection;
    const ownerSelection = inputHandlers.owner?.selection;
    const severitySelection = inputHandlers.severity?.selection;
    const connectorTypeSelection = inputHandlers['connector.type']?.selection;
    const categorySelection = inputHandlers.category?.selection;
    const tagsSelection = inputHandlers.tags?.selection;
    const syncAlertsSelection = inputHandlers['settings.syncAlerts']?.selection;
    const extractObservablesSelection = inputHandlers['settings.extractObservables']?.selection;
    const templateSelection = inputHandlers.template?.selection;
    const customFieldKeySelection = inputHandlers['customFields.key']?.selection;
    const customFieldTypeSelection = inputHandlers['customFields.type']?.selection;

    return {
      core,
      http,
      definition,
      connectorSelection,
      connectorNameSelection,
      ownerSelection,
      severitySelection,
      connectorTypeSelection,
      categorySelection,
      tagsSelection,
      syncAlertsSelection,
      extractObservablesSelection,
      templateSelection,
      customFieldKeySelection,
      customFieldTypeSelection,
    };
  };

  it('returns a public step definition with expected metadata', () => {
    const { definition } = setup();

    expect(definition.id).toBe('cases.createCase');
    expect(definition.actionsMenuGroup).toBe('kibana');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });

  it('searches connector options using connector id and name', async () => {
    const { connectorSelection, http } = setup();

    const results = await connectorSelection!.search('jira', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'connector.id',
    });

    expect(http.get).toHaveBeenCalledWith('/api/actions/connectors');
    expect(results).toEqual([
      {
        value: 'jira-1',
        label: 'Jira Connector',
        description: 'Connector type: .jira',
      },
    ]);
  });

  it('resolves a connector id to option details', async () => {
    const { connectorSelection } = setup();

    const resolved = await connectorSelection!.resolve('jira-1', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'connector.id',
    });

    expect(resolved).toEqual({
      value: 'jira-1',
      label: 'Jira Connector',
      description: 'Connector type: .jira',
    });
  });

  it('returns null when connector id cannot be resolved', async () => {
    const { connectorSelection } = setup();

    const resolved = await connectorSelection!.resolve('missing-connector', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'connector.id',
    });

    expect(resolved).toBeNull();
  });

  it('returns details message for resolved and unresolved connector values', async () => {
    const { connectorSelection } = setup();

    const resolvedDetails = await connectorSelection!.getDetails(
      'jira-1',
      { stepType: 'cases.createCase', scope: 'input', propertyKey: 'connector.id' },
      { value: 'jira-1', label: 'Jira Connector' }
    );
    const unresolvedDetails = await connectorSelection!.getDetails(
      'missing-connector',
      { stepType: 'cases.createCase', scope: 'input', propertyKey: 'connector.id' },
      null
    );

    expect(resolvedDetails.message).toContain('available for case workflows');
    expect(unresolvedDetails.message).toContain('was not found');
  });

  it('supports owner autocomplete with allowed values', async () => {
    const { ownerSelection } = setup();

    const searchResults = await ownerSelection!.search('sec', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'owner',
    });
    const resolved = await ownerSelection!.resolve('securitySolution', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'owner',
    });
    const unresolved = await ownerSelection!.resolve('invalid-owner', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'owner',
    });
    const unresolvedDetails = await ownerSelection!.getDetails(
      'invalid-owner',
      { stepType: 'cases.createCase', scope: 'input', propertyKey: 'owner' },
      null
    );

    expect(searchResults).toEqual([{ value: 'securitySolution', label: 'securitySolution' }]);
    expect(resolved).toEqual({ value: 'securitySolution', label: 'securitySolution' });
    expect(unresolved).toBeNull();
    expect(unresolvedDetails.message).toContain('Allowed values');
  });

  it('supports connector name autocomplete same as connector id', async () => {
    const { connectorNameSelection } = setup();

    const searchResults = await connectorNameSelection!.search('jira', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'connector.name',
    });
    const resolved = await connectorNameSelection!.resolve('Jira Connector', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'connector.name',
    });

    expect(searchResults).toEqual([
      {
        value: 'Jira Connector',
        label: 'Jira Connector',
        description: 'Connector type: .jira',
      },
    ]);
    expect(resolved).toEqual({
      value: 'Jira Connector',
      label: 'Jira Connector',
      description: 'Connector type: .jira',
    });
  });

  it('supports template autocomplete', async () => {
    const { templateSelection } = setup();

    const searchResults = await templateSelection!.search('triage', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'template',
    });
    const resolved = await templateSelection!.resolve('triage_template', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'template',
    });

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

  it('supports custom field key and type autocomplete', async () => {
    const { customFieldKeySelection, customFieldTypeSelection } = setup();

    const keySearchResults = await customFieldKeySelection!.search('priority', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'customFields.key',
    });
    const typeSearchResults = await customFieldTypeSelection!.search('tog', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'customFields.type',
    });

    expect(keySearchResults).toEqual([
      {
        value: 'priority_level',
        label: 'Priority level',
        description: 'key: priority_level | type: text',
      },
    ]);
    expect(typeSearchResults).toEqual([
      {
        value: 'toggle',
        label: 'toggle',
        description: 'Used by 1 configured custom field',
      },
    ]);
  });

  it('supports severity and connector type enum autocomplete', async () => {
    const { severitySelection, connectorTypeSelection } = setup();

    const severityResults = await severitySelection!.search('hi', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'severity',
    });
    const connectorTypeResults = await connectorTypeSelection!.search('jira', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'connector.type',
    });

    expect(severityResults).toEqual([{ value: 'high', label: 'high' }]);
    expect(connectorTypeResults).toEqual([{ value: '.jira', label: '.jira' }]);
  });

  it('supports category and tags suggestions', async () => {
    const { categorySelection, tagsSelection } = setup();

    const categoryResults = await categorySelection!.search('sec', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'category',
    });
    const tagsResults = await tagsSelection!.search('inc', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'tags',
    });

    expect(categoryResults).toEqual([{ value: 'Security', label: 'Security' }]);
    expect(tagsResults).toEqual([{ value: 'incident', label: 'incident' }]);
  });

  it('supports boolean setting autocomplete', async () => {
    const { syncAlertsSelection, extractObservablesSelection } = setup();

    const syncResults = await syncAlertsSelection!.search('tr', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'settings.syncAlerts',
    });
    const extractResults = await extractObservablesSelection!.search('', {
      stepType: 'cases.createCase',
      scope: 'input',
      propertyKey: 'settings.extractObservables',
    });

    expect(syncResults).toEqual([{ value: true, label: 'true', description: 'Enable alert sync' }]);
    expect(extractResults).toEqual([
      { value: true, label: 'true', description: 'Enable observable extraction' },
      { value: false, label: 'false', description: 'Disable observable extraction' },
    ]);
  });
});

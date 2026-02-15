/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, HttpStart } from '@kbn/core/public';
import { createUpdateCaseStepDefinition } from './update_case';

describe('createUpdateCaseStepDefinition', () => {
  const connectors = [
    { id: 'none', name: 'No connector', actionTypeId: '.none', type: '.none' },
    { id: 'jira-1', name: 'Jira Connector', actionTypeId: '.jira', type: '.jira' },
  ];
  const tags = ['security', 'incident'];
  const configurations = [
    {
      owner: 'securitySolution',
      templates: [
        { key: 'triage_template', name: 'Triage template', caseFields: { category: 'Security' } },
      ],
      customFields: [
        { key: 'priority_level', label: 'Priority level', type: 'text', required: true },
      ],
    },
  ];

  const setup = () => {
    interface SelectionHandler {
      search: (input: string, context: unknown) => Promise<unknown>;
      resolve: (value: unknown, context: unknown) => Promise<unknown>;
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

    const definition = createUpdateCaseStepDefinition(core);
    const inputHandlers = (definition.editorHandlers?.input ?? {}) as Record<
      string,
      { selection?: SelectionHandler }
    >;

    return {
      definition,
      statusSelection: inputHandlers['updates.status']?.selection,
      severitySelection: inputHandlers['updates.severity']?.selection,
      connectorIdSelection: inputHandlers['updates.connector.id']?.selection,
      connectorNameSelection: inputHandlers['updates.connector.name']?.selection,
      connectorTypeSelection: inputHandlers['updates.connector.type']?.selection,
      categorySelection: inputHandlers['updates.category']?.selection,
      tagsSelection: inputHandlers['updates.tags']?.selection,
      syncAlertsSelection: inputHandlers['updates.settings.syncAlerts']?.selection,
      customFieldKeySelection: inputHandlers['updates.customFields.key']?.selection,
      customFieldTypeSelection: inputHandlers['updates.customFields.type']?.selection,
    };
  };

  it('returns a public step definition with expected metadata', () => {
    const { definition } = setup();

    expect(definition.id).toBe('cases.updateCase');
    expect(definition.actionsMenuGroup).toBe('kibana');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });

  it('supports enum and connector suggestions for updates', async () => {
    const {
      statusSelection,
      severitySelection,
      connectorIdSelection,
      connectorNameSelection,
      connectorTypeSelection,
    } = setup();

    await expect(
      statusSelection!.search('in-pro', {
        stepType: 'cases.updateCase',
        scope: 'input',
        propertyKey: 'updates.status',
      })
    ).resolves.toEqual([{ value: 'in-progress', label: 'in-progress' }]);

    await expect(
      severitySelection!.search('crit', {
        stepType: 'cases.updateCase',
        scope: 'input',
        propertyKey: 'updates.severity',
      })
    ).resolves.toEqual([{ value: 'critical', label: 'critical' }]);

    await expect(
      connectorIdSelection!.resolve('jira-1', {
        stepType: 'cases.updateCase',
        scope: 'input',
        propertyKey: 'updates.connector.id',
      })
    ).resolves.toEqual({
      value: 'jira-1',
      label: 'Jira Connector',
      description: 'Connector type: .jira',
    });

    await expect(
      connectorNameSelection!.resolve('Jira Connector', {
        stepType: 'cases.updateCase',
        scope: 'input',
        propertyKey: 'updates.connector.name',
      })
    ).resolves.toEqual({
      value: 'Jira Connector',
      label: 'Jira Connector',
      description: 'Connector type: .jira',
    });

    await expect(
      connectorTypeSelection!.search('jira', {
        stepType: 'cases.updateCase',
        scope: 'input',
        propertyKey: 'updates.connector.type',
      })
    ).resolves.toEqual([{ value: '.jira', label: '.jira' }]);
  });

  it('supports category/tags/boolean/custom field suggestions for updates', async () => {
    const {
      categorySelection,
      tagsSelection,
      syncAlertsSelection,
      customFieldKeySelection,
      customFieldTypeSelection,
    } = setup();

    await expect(
      categorySelection!.search('sec', {
        stepType: 'cases.updateCase',
        scope: 'input',
        propertyKey: 'updates.category',
      })
    ).resolves.toEqual([{ value: 'Security', label: 'Security' }]);

    await expect(
      tagsSelection!.search('inc', {
        stepType: 'cases.updateCase',
        scope: 'input',
        propertyKey: 'updates.tags',
      })
    ).resolves.toEqual([{ value: 'incident', label: 'incident' }]);

    await expect(
      syncAlertsSelection!.search('tr', {
        stepType: 'cases.updateCase',
        scope: 'input',
        propertyKey: 'updates.settings.syncAlerts',
      })
    ).resolves.toEqual([{ value: true, label: 'true', description: 'Enable alert sync' }]);

    await expect(
      customFieldKeySelection!.search('priority', {
        stepType: 'cases.updateCase',
        scope: 'input',
        propertyKey: 'updates.customFields.key',
      })
    ).resolves.toEqual([
      {
        value: 'priority_level',
        label: 'Priority level',
        description: 'key: priority_level | type: text',
      },
    ]);

    await expect(
      customFieldTypeSelection!.search('te', {
        stepType: 'cases.updateCase',
        scope: 'input',
        propertyKey: 'updates.customFields.type',
      })
    ).resolves.toEqual([
      {
        value: 'text',
        label: 'text',
        description: 'Used by 1 configured custom field',
      },
    ]);
  });
});

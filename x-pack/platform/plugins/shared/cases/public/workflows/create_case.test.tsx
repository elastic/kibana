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
    { id: 'none', name: 'No connector', actionTypeId: '.none' },
    { id: 'jira-1', name: 'Jira Connector', actionTypeId: '.jira' },
  ];

  const setup = () => {
    const http = {
      get: jest.fn().mockResolvedValue(connectors),
    } as unknown as jest.Mocked<HttpStart>;

    const core = {
      getStartServices: jest.fn().mockResolvedValue([{ http }, {}, {}]),
    } as unknown as jest.Mocked<CoreSetup>;

    const definition = createCreateCaseStepDefinition(core);
    const inputHandlers = (definition.editorHandlers?.input ?? {}) as Record<string, any>;
    const connectorSelection = inputHandlers['connector.id']?.selection;
    const ownerSelection = inputHandlers.owner?.selection;

    return { core, http, definition, connectorSelection, ownerSelection };
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

    expect(http.get).toHaveBeenCalledTimes(1);
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
});

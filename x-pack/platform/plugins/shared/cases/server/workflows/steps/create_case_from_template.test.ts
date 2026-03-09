/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { createCaseFromTemplateStepDefinition } from './create_case_from_template';
import { createStepHandlerContext } from './test_utils';
import type { CasesClient } from '../../client';

const createContext = (input: unknown, config: Record<string, unknown> = {}) =>
  createStepHandlerContext({ input, config, stepType: 'cases.createCaseFromTemplate' });

describe('createCaseFromTemplateStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = createCaseFromTemplateStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.createCaseFromTemplate');
    expect(typeof definition.handler).toBe('function');
    expect(
      definition.inputSchema.safeParse({
        case_template_id: 'triage_template',
      }).success
    ).toBe(true);
  });

  it('resolves template, merges overwrites, and creates the case', async () => {
    const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const get = jest.fn().mockResolvedValue([
      {
        owner: 'securitySolution',
        templates: [
          {
            key: 'triage_template',
            name: 'Triage template',
            caseFields: {
              title: 'Template title',
              description: 'Template description',
              tags: ['template-tag'],
              connector: {
                id: 'none',
                name: 'none',
                type: '.none',
                fields: null,
              },
              settings: { syncAlerts: false },
            },
          },
        ],
      },
    ]);
    const getCasesClient = jest.fn().mockResolvedValue({
      configure: { get },
      cases: { create },
    } as unknown as CasesClient);

    const definition = createCaseFromTemplateStepDefinition(getCasesClient);
    const result = await definition.handler(
      createContext({
        case_template_id: 'triage_template',
        overwrites: {
          title: 'Overwrite title',
          status: 'in-progress',
          connector: {
            id: 'webhook-1',
            name: 'Cases webhook',
            type: '.cases-webhook',
            fields: null,
          },
        },
      })
    );

    expect(get).toHaveBeenCalledWith({ owner: 'securitySolution' });
    expect(create).toHaveBeenCalledWith({
      title: 'Overwrite title',
      assignees: [],
      tags: ['template-tag'],
      category: undefined,
      severity: 'low',
      status: 'in-progress',
      description: 'Template description',
      settings: { syncAlerts: false },
      customFields: [],
      connector: {
        id: 'webhook-1',
        name: 'Cases webhook',
        type: '.cases-webhook',
        fields: null,
      },
      owner: 'securitySolution',
    });
    expect(result).toEqual({
      output: {
        case: expect.objectContaining({
          id: createCaseResponseFixture.id,
          owner: createCaseResponseFixture.owner,
          title: createCaseResponseFixture.title,
        }),
      },
    });
  });

  it('finds template across multiple configurations', async () => {
    const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const get = jest.fn().mockResolvedValue([
      {
        owner: 'securitySolution',
        templates: [
          {
            key: 'first_template',
            name: 'First template',
            caseFields: { title: 'First template title' },
          },
        ],
      },
      {
        owner: 'securitySolution',
        templates: [
          {
            key: 'triage_template',
            name: 'Triage template',
            caseFields: { title: 'Second config template title' },
          },
        ],
      },
    ]);
    const getCasesClient = jest.fn().mockResolvedValue({
      configure: { get },
      cases: { create },
    } as unknown as CasesClient);
    const definition = createCaseFromTemplateStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        case_template_id: 'triage_template',
      })
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Second config template title',
      })
    );
  });

  it('creates case from template defaults when overwrites are not provided', async () => {
    const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const get = jest.fn().mockResolvedValue([
      {
        owner: 'securitySolution',
        templates: [
          {
            key: 'triage_template',
            name: 'Triage template',
            caseFields: {
              title: 'Template title',
              description: 'Template description',
              owner: 'securitySolution',
            },
          },
        ],
      },
    ]);
    const getCasesClient = jest.fn().mockResolvedValue({
      configure: { get },
      cases: { create },
    } as unknown as CasesClient);
    const definition = createCaseFromTemplateStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        case_template_id: 'triage_template',
      })
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Template title',
        description: 'Template description',
        owner: 'securitySolution',
      })
    );
  });

  it('returns error when template cannot be found', async () => {
    const create = jest.fn();
    const get = jest.fn().mockResolvedValue([
      {
        owner: 'securitySolution',
        templates: [],
      },
    ]);
    const getCasesClient = jest.fn().mockResolvedValue({
      configure: { get },
      cases: { create },
    } as unknown as CasesClient);
    const definition = createCaseFromTemplateStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({
        case_template_id: 'missing_template',
      })
    );

    expect(create).not.toHaveBeenCalled();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Case template not found');
  });

  it('pushes case when push-case is enabled', async () => {
    const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const push = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn().mockResolvedValue([
      {
        owner: 'securitySolution',
        templates: [
          {
            key: 'triage_template',
            name: 'Triage template',
            caseFields: {
              title: 'Template title',
              owner: 'securitySolution',
            },
          },
        ],
      },
    ]);
    const getCasesClient = jest.fn().mockResolvedValue({
      configure: { get },
      cases: { create, push },
    } as unknown as CasesClient);
    const definition = createCaseFromTemplateStepDefinition(getCasesClient);

    await definition.handler(
      createContext(
        {
          case_template_id: 'triage_template',
        },
        { 'push-case': true }
      )
    );

    expect(push).toHaveBeenCalledWith({
      caseId: createCaseResponseFixture.id,
      connectorId: createCaseResponseFixture.connector.id,
      pushType: 'automatic',
    });
  });
});

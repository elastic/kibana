/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as yamlStringify } from 'yaml';
import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { createCaseFromTemplateStepDefinition } from './create_case_from_template';
import { createStepHandlerContext } from './test_utils';
import type { CasesClient } from '../../client';

const buildTemplateSO = (definition: Record<string, unknown>, overrides = {}) => ({
  id: 'so-1',
  attributes: {
    templateId: 'triage_template',
    templateVersion: 4,
    name: 'Triage template',
    owner: 'securitySolution',
    definition: yamlStringify(definition),
    deletedAt: null,
    description: '',
    tags: [],
    author: 'elastic',
    usageCount: 0,
    fieldCount: 0,
    fieldDefinitions: [],
    lastUsedAt: null,
    isDefault: false,
    isLatest: true,
    isEnabled: true,
    ...overrides,
  },
});

const createContext = (input: unknown, config: Record<string, unknown> = {}) =>
  createStepHandlerContext({ input, config, stepType: 'cases.createCaseFromTemplate' });

describe('createCaseFromTemplateStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = createCaseFromTemplateStepDefinition(getCasesClient, false);

    expect(definition.id).toBe('cases.createCaseFromTemplate');
    expect(typeof definition.handler).toBe('function');
    expect(
      definition.inputSchema.safeParse({
        owner: 'securitySolution',
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

    const definition = createCaseFromTemplateStepDefinition(getCasesClient, false);
    const result = await definition.handler(
      createContext({
        case_template_id: 'triage_template',
        owner: 'securitySolution',
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
    const definition = createCaseFromTemplateStepDefinition(getCasesClient, false);

    await definition.handler(
      createContext({
        owner: 'securitySolution',
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
    const definition = createCaseFromTemplateStepDefinition(getCasesClient, false);

    await definition.handler(
      createContext({
        owner: 'securitySolution',
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
    const definition = createCaseFromTemplateStepDefinition(getCasesClient, false);

    const result = await definition.handler(
      createContext({
        owner: 'securitySolution',
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
    const definition = createCaseFromTemplateStepDefinition(getCasesClient, false);

    await definition.handler(
      createContext(
        {
          owner: 'securitySolution',
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

  describe('when the templates feature is enabled (v2 path)', () => {
    it('seeds only title/description from a template SO and delegates expansion to cases.create', async () => {
      const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
      const getTemplate = jest.fn().mockResolvedValue(
        buildTemplateSO({
          name: 'Triage default title',
          description: 'Triage default description',
          // Everything below is applied by cases.create's server-side expansion, NOT by the step —
          // the step must not forward these onto the create payload itself.
          severity: 'high',
          tags: ['from-template'],
          fields: [],
        })
      );
      const configureGet = jest.fn();
      const getCasesClient = jest.fn().mockResolvedValue({
        templates: { getTemplate },
        configure: { get: configureGet },
        cases: { create },
      } as unknown as CasesClient);

      const definition = createCaseFromTemplateStepDefinition(getCasesClient, true);
      const result = await definition.handler(
        createContext({
          owner: 'securitySolution',
          case_template_id: 'triage_template',
        })
      );

      expect(getTemplate).toHaveBeenCalledWith('triage_template');
      // The configuration (legacy) lookup must not run when a v2 template SO resolves.
      expect(configureGet).not.toHaveBeenCalled();

      const createPayload = create.mock.calls[0][0];
      expect(createPayload).toEqual(
        expect.objectContaining({
          owner: 'securitySolution',
          title: 'Triage default title',
          description: 'Triage default description',
          template: { id: 'triage_template', version: 4 },
        })
      );
      // The step seeds only the wire-required fields; template severity/tags are expansion's job.
      expect(createPayload.severity).toBe('low');
      expect(createPayload.tags).toEqual([]);

      expect(result).toEqual({
        output: {
          case: expect.objectContaining({ id: createCaseResponseFixture.id }),
        },
      });
    });

    it('lets caller overwrites win over the template-seeded title/description', async () => {
      const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
      const getTemplate = jest.fn().mockResolvedValue(
        buildTemplateSO({
          name: 'Triage default title',
          description: 'Triage default description',
          fields: [],
        })
      );
      const getCasesClient = jest.fn().mockResolvedValue({
        templates: { getTemplate },
        configure: { get: jest.fn() },
        cases: { create },
      } as unknown as CasesClient);

      const definition = createCaseFromTemplateStepDefinition(getCasesClient, true);
      await definition.handler(
        createContext({
          owner: 'securitySolution',
          case_template_id: 'triage_template',
          overwrites: { title: 'Caller title' },
        })
      );

      const createPayload = create.mock.calls[0][0];
      expect(createPayload.title).toBe('Caller title');
      expect(createPayload.description).toBe('Triage default description');
      expect(createPayload.template).toEqual({ id: 'triage_template', version: 4 });
    });

    it('falls back to the legacy configuration path when the id is not a v2 template SO', async () => {
      const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
      const getTemplate = jest.fn().mockResolvedValue(undefined);
      const configureGet = jest.fn().mockResolvedValue([
        {
          owner: 'securitySolution',
          templates: [
            {
              key: 'triage_template',
              name: 'Legacy template',
              caseFields: { title: 'Legacy title' },
            },
          ],
        },
      ]);
      const getCasesClient = jest.fn().mockResolvedValue({
        templates: { getTemplate },
        configure: { get: configureGet },
        cases: { create },
      } as unknown as CasesClient);

      const definition = createCaseFromTemplateStepDefinition(getCasesClient, true);
      await definition.handler(
        createContext({
          owner: 'securitySolution',
          case_template_id: 'triage_template',
        })
      );

      expect(getTemplate).toHaveBeenCalledWith('triage_template');
      expect(configureGet).toHaveBeenCalledWith({ owner: 'securitySolution' });
      const createPayload = create.mock.calls[0][0];
      expect(createPayload.title).toBe('Legacy title');
      // The legacy path never pins a template reference on the created case.
      expect(createPayload.template).toBeUndefined();
    });
  });
});

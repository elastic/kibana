/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as yamlStringify } from 'yaml';
import type { SavedObject } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { createCaseFromTemplateStepDefinition } from './create_case_from_template';
import { createStepHandlerContext } from './test_utils';
import type { CasesClient } from '../../client';
import type { CasePostRequest } from '../../../common/types/api';
import type { Template } from '../../../common/types/domain/template/v1';
import {
  createTemplatesServiceMock,
  createFieldDefinitionsServiceMock,
} from '../../services/mocks';
import {
  applyTemplateDefaultsToCreateRequest,
  resolveTemplateForCreate,
} from '../../client/cases/expand_template_defaults';

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
    it('forwards a minimal payload that leaves severity/assignees/extractObservables to cases.create expansion', async () => {
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
      // CRITICAL: the step must NOT materialize these optional fields. cases.create's expansion only
      // applies a template default when the field is `=== undefined`, so seeding severity /
      // assignees / settings.extractObservables here would silently suppress the template's own
      // defaults. They must be absent from the forwarded payload.
      expect('severity' in createPayload).toBe(false);
      expect('assignees' in createPayload).toBe(false);
      expect('category' in createPayload).toBe(false);
      expect(createPayload.settings).toEqual({ syncAlerts: true });
      expect('extractObservables' in createPayload.settings).toBe(false);
      // Tags are seeded empty (= "caller sent none") so expansion applies the template's tags.
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

    it('fails with owner context when the resolved template belongs to a different owner', async () => {
      const create = jest.fn();
      const getTemplate = jest
        .fn()
        .mockResolvedValue(
          buildTemplateSO({ name: 'Triage default title', fields: [] }, { owner: 'observability' })
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

      expect(create).not.toHaveBeenCalled();
      // The legacy configuration fallback must not run either — the id resolved to a real (if
      // cross-owner) v2 template SO, so this is not the "unknown id" case.
      expect(configureGet).not.toHaveBeenCalled();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe(
        'Case template "triage_template" not found for owner "securitySolution"'
      );
    });

    it('returns a forbidden error and never calls create when getTemplate is unauthorized', async () => {
      const create = jest.fn();
      const getTemplate = jest.fn().mockRejectedValue(new Error('Unauthorized to get template'));
      const getCasesClient = jest.fn().mockResolvedValue({
        templates: { getTemplate },
        configure: { get: jest.fn() },
        cases: { create },
      } as unknown as CasesClient);

      const definition = createCaseFromTemplateStepDefinition(getCasesClient, true);
      const result = await definition.handler(
        createContext({
          owner: 'securitySolution',
          case_template_id: 'triage_template',
        })
      );

      expect(create).not.toHaveBeenCalled();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain('Unauthorized to get template');
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

    // Regression guard for the dropped-template-defaults bug: it is not enough that the step forwards
    // a minimal payload — that payload has to actually let cases.create's real expansion apply the
    // template's severity / category / assignees / extractObservables defaults. Here we capture what
    // the step forwards and run it through the REAL applyTemplateDefaultsToCreateRequest, asserting
    // the final persisted values carry the template defaults rather than getInitialCaseValue's
    // hardcoded low / [] / true that previously suppressed them.
    it('forwards a payload that expansion resolves to the template defaults (end-to-end)', async () => {
      const templateDefinition = {
        name: 'Triage default title',
        description: 'Triage default description',
        severity: 'high',
        category: 'events',
        tags: ['from-template'],
        settings: { syncAlerts: false, extractObservables: true },
        assignees: [{ uid: 'template-assignee' }],
        fields: [],
      };

      const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
      const getTemplate = jest
        .fn()
        .mockResolvedValue(buildTemplateSO(templateDefinition, { templateVersion: 4 }));
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
        })
      );

      // What the step handed to cases.create.
      const forwardedPayload = create.mock.calls[0][0] as CasePostRequest;

      // Now drive that payload through the exact server-side expansion cases.create would run.
      const templatesService = createTemplatesServiceMock();
      const fieldDefinitionsService = createFieldDefinitionsServiceMock();
      fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [],
        total: 0,
      });
      templatesService.getTemplate.mockResolvedValue(
        buildTemplateSO(templateDefinition, {
          templateVersion: 4,
        }) as unknown as SavedObject<Template>
      );
      const resolved = await resolveTemplateForCreate({
        templateId: 'triage_template',
        version: forwardedPayload.template?.version,
        owner: 'securitySolution',
        templatesService,
        fieldDefinitionsService,
      });
      const expanded = await applyTemplateDefaultsToCreateRequest(forwardedPayload, resolved, {
        hasPlatinumLicenseOrGreater: true,
        actionsClient: actionsClientMock.create(),
        logger: loggingSystemMock.createLogger(),
      });

      // The template defaults survive expansion — the previous getInitialCaseValue seeding would
      // have pinned severity: 'low', assignees: [], and extractObservables: true instead.
      expect(expanded.severity).toBe('high');
      expect(expanded.category).toBe('events');
      expect(expanded.assignees).toEqual([{ uid: 'template-assignee' }]);
      expect(expanded.tags).toEqual(['from-template']);
      // `syncAlerts` is seeded from the template (unlike the other defaults, expansion never
      // fills it in), so the template's `syncAlerts: false` must survive end-to-end.
      expect(expanded.settings).toEqual({ syncAlerts: false, extractObservables: true });
      expect(expanded.template).toEqual({ id: 'triage_template', version: 4 });
    });

    it('seeds settings.syncAlerts from the template default instead of hardcoding true', async () => {
      const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
      const getTemplate = jest.fn().mockResolvedValue(
        buildTemplateSO({
          name: 'Triage default title',
          description: 'Triage default description',
          settings: { syncAlerts: false },
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
        })
      );

      const createPayload = create.mock.calls[0][0];
      expect(createPayload.settings).toEqual({ syncAlerts: false });
    });

    it('defaults settings.syncAlerts to true when the template does not specify it', async () => {
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
        })
      );

      const createPayload = create.mock.calls[0][0];
      expect(createPayload.settings).toEqual({ syncAlerts: true });
    });

    it('fails with a clear message when the template has no default title and no title overwrite is provided', async () => {
      const create = jest.fn();
      const getTemplate = jest.fn().mockResolvedValue(
        buildTemplateSO({
          // No `name` in the definition, i.e. no default title.
          fields: [],
        })
      );
      const getCasesClient = jest.fn().mockResolvedValue({
        templates: { getTemplate },
        configure: { get: jest.fn() },
        cases: { create },
      } as unknown as CasesClient);

      const definition = createCaseFromTemplateStepDefinition(getCasesClient, true);
      const result = await definition.handler(
        createContext({
          owner: 'securitySolution',
          case_template_id: 'triage_template',
        })
      );

      expect(create).not.toHaveBeenCalled();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe(
        'Case template "triage_template" has no default title; provide "overwrites.title"'
      );
    });

    it('does not require a template default title when the caller provides a title overwrite', async () => {
      const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
      const getTemplate = jest.fn().mockResolvedValue(
        buildTemplateSO({
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
      const result = await definition.handler(
        createContext({
          owner: 'securitySolution',
          case_template_id: 'triage_template',
          overwrites: { title: 'Caller-supplied title' },
        })
      );

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Caller-supplied title' })
      );
      expect(result.error).toBeUndefined();
    });

    it('fails with a clear message when the template has no default description and no description overwrite is provided', async () => {
      const create = jest.fn();
      const getTemplate = jest.fn().mockResolvedValue(
        buildTemplateSO({
          name: 'Triage default title',
          // No `description` in the definition, i.e. no default description.
          fields: [],
        })
      );
      const getCasesClient = jest.fn().mockResolvedValue({
        templates: { getTemplate },
        configure: { get: jest.fn() },
        cases: { create },
      } as unknown as CasesClient);

      const definition = createCaseFromTemplateStepDefinition(getCasesClient, true);
      const result = await definition.handler(
        createContext({
          owner: 'securitySolution',
          case_template_id: 'triage_template',
        })
      );

      expect(create).not.toHaveBeenCalled();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe(
        'Case template "triage_template" has no default description; provide "overwrites.description"'
      );
    });

    it('does not require a template default description when the caller provides a description overwrite', async () => {
      const create = jest.fn().mockResolvedValue(createCaseResponseFixture);
      const getTemplate = jest.fn().mockResolvedValue(
        buildTemplateSO({
          name: 'Triage default title',
          fields: [],
        })
      );
      const getCasesClient = jest.fn().mockResolvedValue({
        templates: { getTemplate },
        configure: { get: jest.fn() },
        cases: { create },
      } as unknown as CasesClient);

      const definition = createCaseFromTemplateStepDefinition(getCasesClient, true);
      const result = await definition.handler(
        createContext({
          owner: 'securitySolution',
          case_template_id: 'triage_template',
          overwrites: { description: 'Caller-supplied description' },
        })
      );

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Caller-supplied description' })
      );
      expect(result.error).toBeUndefined();
    });
  });
});

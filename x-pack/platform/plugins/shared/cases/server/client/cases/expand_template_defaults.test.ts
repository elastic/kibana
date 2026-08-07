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
import { CaseSeverity, ConnectorTypes } from '../../../common/types/domain';
import type { Template } from '../../../common/types/domain/template/v1';
import type { CasePostRequest } from '../../../common/types/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common';
import {
  createTemplatesServiceMock,
  createFieldDefinitionsServiceMock,
} from '../../services/mocks';
import {
  applyTemplateDefaultsToCreateRequest,
  ensureTemplateVersionIsPinned,
  resolveTemplateForCreate,
} from './expand_template_defaults';

const buildTemplateSO = (
  definition: Record<string, unknown>,
  overrides: Partial<Template> = {}
): SavedObject<Template> =>
  ({
    id: 'so-1',
    attributes: {
      templateId: 'template-1',
      templateVersion: 3,
      name: 'My Template',
      owner: SECURITY_SOLUTION_OWNER,
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
    } as unknown as Template,
  } as SavedObject<Template>);

const baseRequest: CasePostRequest = {
  title: 'My Case',
  description: 'a description',
  tags: ['caller-tag'],
  connector: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
  settings: { syncAlerts: true },
  owner: SECURITY_SOLUTION_OWNER,
  template: { id: 'template-1' },
};

const kitchenSinkDefinition = {
  name: 'Default title',
  severity: 'high',
  category: 'events',
  tags: ['template-tag', 'caller-tag'],
  settings: { syncAlerts: false, extractObservables: true },
  assignees: [{ uid: 'template-assignee' }],
  fields: [
    {
      name: 'priority',
      type: 'keyword',
      control: 'INPUT_TEXT',
      label: 'Priority',
      metadata: { default: 'medium' },
    },
    { name: 'effort', type: 'integer', control: 'INPUT_NUMBER', label: 'Effort' },
    { name: 'notes', control: 'MARKDOWN', metadata: { content: '# hi' } },
  ],
};

describe('expand_template_defaults', () => {
  const templatesService = createTemplatesServiceMock();
  const fieldDefinitionsService = createFieldDefinitionsServiceMock();
  const actionsClient = actionsClientMock.create();
  const logger = loggingSystemMock.createLogger();

  const resolve = (version?: number) =>
    resolveTemplateForCreate({
      templateId: 'template-1',
      version,
      owner: SECURITY_SOLUTION_OWNER,
      templatesService,
      fieldDefinitionsService,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: [],
      total: 0,
    });
    actionsClient.get.mockRejectedValue(new Error('not found'));
  });

  describe('resolveTemplateForCreate', () => {
    it('resolves the latest version when the request omits one and pins the concrete version', async () => {
      templatesService.getTemplate.mockResolvedValue(buildTemplateSO(kitchenSinkDefinition));

      const resolved = await resolve();

      expect(templatesService.getTemplate).toHaveBeenCalledWith('template-1', undefined, {
        includeDeleted: false,
      });
      expect(resolved.template).toEqual({ id: 'template-1', version: 3 });
    });

    it('passes an explicit version through as a string', async () => {
      templatesService.getTemplate.mockResolvedValue(
        buildTemplateSO(kitchenSinkDefinition, { templateVersion: 2 })
      );

      const resolved = await resolve(2);

      expect(templatesService.getTemplate).toHaveBeenCalledWith('template-1', '2', {
        includeDeleted: false,
      });
      expect(resolved.template).toEqual({ id: 'template-1', version: 2 });
    });

    it('throws badRequest when the template does not exist', async () => {
      templatesService.getTemplate.mockResolvedValue(undefined);

      await expect(resolve()).rejects.toThrow('Template template-1 not found');
    });

    it('throws the same not-found error for a cross-owner template (no existence leak)', async () => {
      templatesService.getTemplate.mockResolvedValue(
        buildTemplateSO(kitchenSinkDefinition, { owner: 'observability' })
      );

      await expect(resolve()).rejects.toThrow('Template template-1 not found');
    });

    it('throws badRequest for an invalid definition', async () => {
      templatesService.getTemplate.mockResolvedValue(
        buildTemplateSO({ severity: 'not-a-severity' })
      );

      await expect(resolve()).rejects.toThrow('Template template-1 has an invalid definition');
    });

    it('resolves $ref fields against the owner field library', async () => {
      templatesService.getTemplate.mockResolvedValue(
        buildTemplateSO({ fields: [{ $ref: 'severity_level' }] })
      );
      fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'severity_level',
            owner: SECURITY_SOLUTION_OWNER,
            description: '',
            isGlobal: false,
            definition: yamlStringify({
              name: 'severity_level',
              type: 'keyword',
              control: 'SELECT_BASIC',
              label: 'Severity Level',
              metadata: { options: ['Low', 'High'], default: 'Low' },
            }),
          },
        ],
        total: 1,
      });

      const resolved = await resolve();

      expect(resolved.resolvedFields).toHaveLength(1);
      expect(resolved.resolvedFields[0].name).toBe('severity_level');
    });
  });

  describe('applyTemplateDefaultsToCreateRequest', () => {
    const expand = async (
      query: CasePostRequest,
      definition: Record<string, unknown> = kitchenSinkDefinition,
      { hasPlatinumLicenseOrGreater = true }: { hasPlatinumLicenseOrGreater?: boolean } = {}
    ) => {
      templatesService.getTemplate.mockResolvedValue(buildTemplateSO(definition));
      const resolved = await resolve();
      return applyTemplateDefaultsToCreateRequest(query, resolved, {
        hasPlatinumLicenseOrGreater,
        actionsClient,
        logger,
      });
    };

    it('applies template defaults for omitted fields and pins the template version', async () => {
      const expanded = await expand(baseRequest);

      expect(expanded.template).toEqual({ id: 'template-1', version: 3 });
      expect(expanded.severity).toBe(CaseSeverity.HIGH);
      expect(expanded.category).toBe('events');
      expect(expanded.assignees).toEqual([{ uid: 'template-assignee' }]);
      expect(expanded.settings).toEqual({ syncAlerts: true, extractObservables: true });
      expect(expanded.extended_fields).toEqual({
        priority_as_keyword: 'medium',
        effort_as_integer: '',
      });
    });

    it('keeps caller tags and does not apply template tags when the caller sent any', async () => {
      const expanded = await expand(baseRequest);

      expect(expanded.tags).toEqual(['caller-tag']);
    });

    it('applies (and dedupes) template tags only when the caller sent none', async () => {
      const expanded = await expand(
        { ...baseRequest, tags: [] },
        { ...kitchenSinkDefinition, tags: ['template-tag', 'template-tag', 'other-tag'] }
      );

      expect(expanded.tags).toEqual(['template-tag', 'other-tag']);
    });

    it('an explicit empty tags array with no template tags stays empty', async () => {
      const expanded = await expand({ ...baseRequest, tags: [] }, { name: 'No tags', fields: [] });

      expect(expanded.tags).toEqual([]);
    });

    it('caller-sent values win over template defaults', async () => {
      const expanded = await expand({
        ...baseRequest,
        severity: CaseSeverity.CRITICAL,
        category: null,
        assignees: [{ uid: 'caller-assignee' }],
        settings: { syncAlerts: true, extractObservables: false },
        extended_fields: { priority_as_keyword: 'urgent' },
      });

      expect(expanded.severity).toBe(CaseSeverity.CRITICAL);
      expect(expanded.category).toBeNull();
      expect(expanded.assignees).toEqual([{ uid: 'caller-assignee' }]);
      expect(expanded.settings).toEqual({ syncAlerts: true, extractObservables: false });
      expect(expanded.extended_fields).toEqual({
        priority_as_keyword: 'urgent',
        effort_as_integer: '',
      });
    });

    it('a caller-sent empty string wins over a template default', async () => {
      const expanded = await expand({
        ...baseRequest,
        extended_fields: { priority_as_keyword: '' },
      });

      expect(expanded.extended_fields?.priority_as_keyword).toBe('');
    });

    it('merges a caller-sent extended_fields subset with the remaining template defaults', async () => {
      const expanded = await expand({
        ...baseRequest,
        extended_fields: { effort_as_integer: '5' },
      });

      expect(expanded.extended_fields).toEqual({
        priority_as_keyword: 'medium',
        effort_as_integer: '5',
      });
    });

    it('never stores display-only (MARKDOWN) fields', async () => {
      const expanded = await expand(baseRequest);

      expect(Object.keys(expanded.extended_fields ?? {})).not.toContain('notes_as_keyword');
    });

    it('title and description are never overridden (required on the wire)', async () => {
      const expanded = await expand(baseRequest, {
        ...kitchenSinkDefinition,
        name: 'Template default title',
        description: 'Template default description',
      });

      expect(expanded.title).toBe('My Case');
      expect(expanded.description).toBe('a description');
    });

    it('skips template assignees without a Platinum license', async () => {
      const expanded = await expand(baseRequest, kitchenSinkDefinition, {
        hasPlatinumLicenseOrGreater: false,
      });

      expect(expanded.assignees).toBeUndefined();
    });

    it('an explicit empty assignees array is a caller decision and wins', async () => {
      const expanded = await expand({ ...baseRequest, assignees: [] });

      expect(expanded.assignees).toEqual([]);
    });

    it('resolves and applies the template connector only when the caller sent .none', async () => {
      const definitionWithConnector = {
        ...kitchenSinkDefinition,
        connector: { id: 'jira-1', type: '.jira', fields: null },
      };
      actionsClient.get.mockResolvedValue({ name: 'My Jira' } as Awaited<
        ReturnType<typeof actionsClient.get>
      >);

      const expandedFromNone = await expand(baseRequest, definitionWithConnector);
      expect(expandedFromNone.connector).toEqual({
        id: 'jira-1',
        type: '.jira',
        fields: null,
        name: 'My Jira',
      });
      expect(actionsClient.get).toHaveBeenCalledWith({ id: 'jira-1' });
    });

    it('does not resolve the template connector when the caller supplied their own', async () => {
      const definitionWithConnector = {
        ...kitchenSinkDefinition,
        connector: { id: 'jira-1', type: '.jira', fields: null },
      };
      const callerConnector = {
        id: 'snow-1',
        name: 'My SNOW',
        type: ConnectorTypes.serviceNowITSM,
        fields: null,
      };

      const expanded = await expand(
        { ...baseRequest, connector: callerConnector },
        definitionWithConnector
      );

      expect(expanded.connector).toEqual(callerConnector);
      // Connector resolution is deferred behind the .none check, so a caller with their own
      // connector never triggers the actions-client round-trip.
      expect(actionsClient.get).not.toHaveBeenCalled();
    });

    it('drops the template connector (and logs) when its id no longer resolves', async () => {
      const definitionWithConnector = {
        ...kitchenSinkDefinition,
        connector: { id: 'deleted-connector', type: '.jira', fields: null },
      };
      // actionsClient.get rejects by default (see beforeEach).

      const expanded = await expand(baseRequest, definitionWithConnector);

      // The caller's .none connector is kept and the debug log makes the drop diagnosable.
      expect(expanded.connector).toEqual(baseRequest.connector);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Dropping template connector default "deleted-connector"')
      );
    });

    it('is a no-op for a fully-populated request (UI idempotency)', async () => {
      const fullyPopulated: CasePostRequest = {
        ...baseRequest,
        template: { id: 'template-1', version: 3 },
        severity: CaseSeverity.HIGH,
        category: 'events',
        assignees: [{ uid: 'template-assignee' }],
        tags: ['template-tag', 'caller-tag'],
        settings: { syncAlerts: false, extractObservables: true },
        extended_fields: { priority_as_keyword: 'medium', effort_as_integer: '' },
      };

      const expanded = await expand(fullyPopulated);

      expect(expanded).toEqual(fullyPopulated);
    });

    it('leaves extended_fields undefined when the template has no stored fields and the caller sent none', async () => {
      const expanded = await expand(baseRequest, { name: 'No fields', fields: [] });

      expect(expanded.extended_fields).toBeUndefined();
    });
  });

  describe('ensureTemplateVersionIsPinned', () => {
    it('accepts null, undefined, and pinned references', () => {
      expect(() => ensureTemplateVersionIsPinned(null)).not.toThrow();
      expect(() => ensureTemplateVersionIsPinned(undefined)).not.toThrow();
      expect(() => ensureTemplateVersionIsPinned({ id: 't', version: 1 })).not.toThrow();
    });

    it('rejects an unpinned reference', () => {
      expect(() => ensureTemplateVersionIsPinned({ id: 't' })).toThrow(
        'template.version is required'
      );
    });
  });
});

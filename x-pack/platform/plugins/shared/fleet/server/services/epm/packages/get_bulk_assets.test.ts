/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry, SavedObjectsClientContract } from '@kbn/core/server';

import { ElasticsearchAssetType, KibanaSavedObjectType } from '../../../../common/types';

import { appContextService } from '../../app_context';

import { getBulkAssets } from './get_bulk_assets';

describe('getBulkAssets', () => {
  it('uses attributes.name as the display title when attributes.title is unavailable', async () => {
    const soClient = {
      bulkResolve: jest.fn().mockResolvedValue({
        resolved_objects: [
          {
            saved_object: {
              id: 'sample_security_rule',
              type: KibanaSavedObjectType.securityRule,
              updated_at: '2026-05-28T00:00:00.000Z',
              attributes: {
                name: 'Svchost spawning Cmd',
                description:
                  'Identifies a suspicious parent child process relationship with cmd.exe descending from svchost.exe',
              },
            },
          },
        ],
      }),
      getCurrentNamespace: jest.fn().mockReturnValue(undefined),
    } as unknown as SavedObjectsClientContract;

    const soTypeRegistry = {
      getType: jest.fn().mockReturnValue({
        management: {},
      }),
    } as unknown as ISavedObjectTypeRegistry;

    const assets = await getBulkAssets(soClient, soTypeRegistry, [
      {
        id: 'sample_security_rule',
        type: KibanaSavedObjectType.securityRule,
      },
    ]);

    expect(assets).toEqual([
      {
        id: 'sample_security_rule',
        type: KibanaSavedObjectType.securityRule,
        updatedAt: '2026-05-28T00:00:00.000Z',
        attributes: {
          title: 'Svchost spawning Cmd',
          description:
            'Identifies a suspicious parent child process relationship with cmd.exe descending from svchost.exe',
        },
        appLink: '',
      },
    ]);
  });

  it('forwards alerting rule template engine and v2 nested description', async () => {
    const soClient = {
      bulkResolve: jest.fn().mockResolvedValue({
        resolved_objects: [
          {
            saved_object: {
              id: 'v1-template',
              type: KibanaSavedObjectType.alertingRuleTemplate,
              updated_at: '2026-08-17T00:00:00.000Z',
              attributes: {
                engine: 'v1',
                name: 'Classic CPU template',
                description: 'Classic description',
              },
            },
          },
          {
            saved_object: {
              id: 'v2-template',
              type: KibanaSavedObjectType.alertingRuleTemplate,
              updated_at: '2026-08-17T00:00:00.000Z',
              attributes: {
                engine: 'v2',
                rule: {
                  metadata: {
                    name: 'v2 CPU template',
                    description: 'v2 description',
                  },
                },
              },
            },
          },
        ],
      }),
      getCurrentNamespace: jest.fn().mockReturnValue(undefined),
    } as unknown as SavedObjectsClientContract;

    const soTypeRegistry = {
      getType: jest.fn().mockReturnValue({
        management: {
          getTitle: (obj: { attributes: { engine?: string; name?: string; rule?: unknown } }) =>
            obj.attributes.engine === 'v2'
              ? (obj.attributes.rule as { metadata: { name: string } }).metadata.name
              : obj.attributes.name,
        },
      }),
    } as unknown as ISavedObjectTypeRegistry;

    const assets = await getBulkAssets(soClient, soTypeRegistry, [
      { id: 'v1-template', type: KibanaSavedObjectType.alertingRuleTemplate },
      { id: 'v2-template', type: KibanaSavedObjectType.alertingRuleTemplate },
    ]);

    expect(assets).toEqual([
      {
        id: 'v1-template',
        type: KibanaSavedObjectType.alertingRuleTemplate,
        updatedAt: '2026-08-17T00:00:00.000Z',
        attributes: {
          title: 'Classic CPU template',
          description: 'Classic description',
          engine: 'v1',
        },
        appLink: '',
      },
      {
        id: 'v2-template',
        type: KibanaSavedObjectType.alertingRuleTemplate,
        updatedAt: '2026-08-17T00:00:00.000Z',
        attributes: {
          title: 'v2 CPU template',
          description: 'v2 description',
          engine: 'v2',
        },
        appLink: '',
      },
    ]);
  });

  it('keeps the Kibana link for Elasticsearch assets, which resolve as unsupported types', async () => {
    const soClient = {
      bulkResolve: jest.fn().mockResolvedValue({
        resolved_objects: [
          {
            saved_object: {
              id: 'logs-lmd.pivot_transform_ea-template',
              type: ElasticsearchAssetType.indexTemplate,
              error: {
                statusCode: 400,
                error: 'Bad Request',
                message: 'Unsupported saved object type: [index_template]: Bad Request',
              },
            },
          },
        ],
      }),
      getCurrentNamespace: jest.fn().mockReturnValue(undefined),
    } as unknown as SavedObjectsClientContract;

    const soTypeRegistry = {
      getType: jest.fn().mockReturnValue(undefined),
    } as unknown as ISavedObjectTypeRegistry;

    const assets = await getBulkAssets(soClient, soTypeRegistry, [
      {
        id: 'logs-lmd.pivot_transform_ea-template',
        type: ElasticsearchAssetType.indexTemplate,
      },
    ]);

    expect(assets).toEqual([
      {
        id: 'logs-lmd.pivot_transform_ea-template',
        type: ElasticsearchAssetType.indexTemplate,
        attributes: {},
        appLink:
          '/app/management/data/index_management/templates/logs-lmd.pivot_transform_ea-template',
      },
    ]);
  });

  describe('workflow assets', () => {
    const soTypeRegistry = {
      getType: jest.fn().mockReturnValue(undefined),
    } as unknown as ISavedObjectTypeRegistry;
    const createSoClient = () =>
      ({
        bulkResolve: jest.fn().mockResolvedValue({ resolved_objects: [] }),
        getCurrentNamespace: jest.fn().mockReturnValue(undefined),
      } as unknown as jest.Mocked<SavedObjectsClientContract>);
    const mockClient = (
      states: Array<{ workflowId: string; templateValues?: unknown }> | undefined
    ) => {
      const getInstalledWorkflowState = jest.fn(
        async (workflowId: string) =>
          states?.find((state) => state.workflowId === workflowId) ?? null
      );
      jest
        .spyOn(appContextService, 'getManagedWorkflowsClient')
        .mockResolvedValue(states ? ({ getInstalledWorkflowState } as any) : undefined);
      return getInstalledWorkflowState;
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('resolves workflows through the managed workflows client, not saved objects', async () => {
      mockClient([
        {
          workflowId: 'wf-1',
          templateValues: { yaml: 'name: Hello\ndescription: Says hello\n' },
        },
      ]);
      const soClient = createSoClient();

      const assets = await getBulkAssets(soClient, soTypeRegistry, [
        { id: 'wf-1', type: KibanaSavedObjectType.workflow },
      ]);

      expect(soClient.bulkResolve).toHaveBeenCalledWith([]);
      expect(assets).toEqual([
        {
          id: 'wf-1',
          type: KibanaSavedObjectType.workflow,
          attributes: { title: 'Hello', description: 'Says hello' },
          appLink: '/app/workflows/wf-1',
        },
      ]);
    });

    it('falls back to the workflow id when the YAML has no name', async () => {
      mockClient([{ workflowId: 'wf-1', templateValues: { yaml: 'enabled: false' } }]);

      const assets = await getBulkAssets(createSoClient(), soTypeRegistry, [
        { id: 'wf-1', type: KibanaSavedObjectType.workflow },
      ]);

      expect(assets[0].attributes).toEqual({ title: 'wf-1', description: undefined });
    });

    it.each([
      ['invalid YAML', { yaml: 'name: [unclosed' }],
      ['an empty YAML document', { yaml: '' }],
      ['missing template values', undefined],
    ])('falls back to the workflow id for %s', async (_case, templateValues) => {
      mockClient([{ workflowId: 'wf-1', templateValues }]);

      const assets = await getBulkAssets(createSoClient(), soTypeRegistry, [
        { id: 'wf-1', type: KibanaSavedObjectType.workflow },
      ]);

      expect(assets[0].attributes.title).toBe('wf-1');
    });

    it('skips workflows that are not installed', async () => {
      mockClient([]);

      const assets = await getBulkAssets(createSoClient(), soTypeRegistry, [
        { id: 'wf-1', type: KibanaSavedObjectType.workflow },
      ]);

      expect(assets).toEqual([]);
    });

    it('returns no workflows when the managed workflows client is not available', async () => {
      mockClient(undefined);

      const assets = await getBulkAssets(createSoClient(), soTypeRegistry, [
        { id: 'wf-1', type: KibanaSavedObjectType.workflow },
      ]);

      expect(assets).toEqual([]);
    });

    it('does not look up workflows when none is requested', async () => {
      const getInstalledWorkflowState = mockClient([]);

      await getBulkAssets(createSoClient(), soTypeRegistry, []);

      expect(getInstalledWorkflowState).not.toHaveBeenCalled();
    });

    it('looks up each requested workflow once in the space of the request', async () => {
      const getInstalledWorkflowState = mockClient([
        { workflowId: 'wf-1', templateValues: { yaml: 'name: One' } },
      ]);
      const soClient = createSoClient();
      soClient.getCurrentNamespace.mockReturnValue('my-space');

      await getBulkAssets(soClient, soTypeRegistry, [
        { id: 'wf-1', type: KibanaSavedObjectType.workflow },
        { id: 'wf-1', type: KibanaSavedObjectType.workflow },
      ]);

      expect(getInstalledWorkflowState).toHaveBeenCalledTimes(1);
      expect(getInstalledWorkflowState).toHaveBeenCalledWith('wf-1', 'my-space');
    });
  });
});

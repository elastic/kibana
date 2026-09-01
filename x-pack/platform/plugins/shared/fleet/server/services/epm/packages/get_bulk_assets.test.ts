/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry, SavedObjectsClientContract } from '@kbn/core/server';

import { ElasticsearchAssetType, KibanaSavedObjectType } from '../../../../common/types';

import { getBulkAssets, getKibanaLinkForExternalAsset } from './get_bulk_assets';

describe('getKibanaLinkForExternalAsset', () => {
  it('returns workflow and agent builder links', () => {
    expect(
      getKibanaLinkForExternalAsset(
        KibanaSavedObjectType.workflow,
        'fleet-default-sdlc-intel-github-catalog-repos'
      )
    ).toBe('/app/workflows/fleet-default-sdlc-intel-github-catalog-repos');
    expect(
      getKibanaLinkForExternalAsset(
        KibanaSavedObjectType.agent,
        'fleet-default-sdlc-intel-sdlc-coverage-analysis'
      )
    ).toBe('/app/agent_builder/agents/fleet-default-sdlc-intel-sdlc-coverage-analysis/overview');
  });
});

describe('getBulkAssets', () => {
  it('returns external workflow and agent assets with app links without bulkResolve', async () => {
    const soClient = {
      bulkResolve: jest.fn(),
    } as unknown as SavedObjectsClientContract;

    const soTypeRegistry = {
      getType: jest.fn(),
    } as unknown as ISavedObjectTypeRegistry;

    const assets = await getBulkAssets(
      soClient,
      soTypeRegistry,
      [
        {
          id: 'fleet-default-sdlc-intel-github-catalog-repos',
          type: KibanaSavedObjectType.workflow,
        },
        {
          id: 'fleet-default-sdlc-intel-sdlc-coverage-analysis',
          type: KibanaSavedObjectType.agent,
        },
      ],
      {
        externalAssetEnricher: async () => ({
          'fleet-default-sdlc-intel-github-catalog-repos': {
            title: 'SDLC GitHub catalog repos (GraphQL)',
            description: 'Catalog workflow',
          },
          'fleet-default-sdlc-intel-sdlc-coverage-analysis': {
            title: 'SDLC Coverage Analysis',
            description: 'Coverage analyst',
          },
        }),
      }
    );

    expect(soClient.bulkResolve).not.toHaveBeenCalled();
    expect(assets).toEqual([
      {
        id: 'fleet-default-sdlc-intel-github-catalog-repos',
        type: KibanaSavedObjectType.workflow,
        attributes: {
          title: 'SDLC GitHub catalog repos (GraphQL)',
          description: 'Catalog workflow',
        },
        appLink: '/app/workflows/fleet-default-sdlc-intel-github-catalog-repos',
      },
      {
        id: 'fleet-default-sdlc-intel-sdlc-coverage-analysis',
        type: KibanaSavedObjectType.agent,
        attributes: {
          title: 'SDLC Coverage Analysis',
          description: 'Coverage analyst',
        },
        appLink:
          '/app/agent_builder/agents/fleet-default-sdlc-intel-sdlc-coverage-analysis/overview',
      },
    ]);
  });

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
});

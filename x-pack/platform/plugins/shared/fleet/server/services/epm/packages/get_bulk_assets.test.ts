/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry, SavedObjectsClientContract } from '@kbn/core/server';

import { ElasticsearchAssetType, KibanaSavedObjectType } from '../../../../common/types';

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

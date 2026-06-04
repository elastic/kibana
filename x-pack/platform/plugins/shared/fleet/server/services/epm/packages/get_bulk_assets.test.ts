/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry, SavedObjectsClientContract } from '@kbn/core/server';

import { KibanaSavedObjectType } from '../../../../common/types';

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
});

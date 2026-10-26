/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { EscalationsService } from '../../escalations/services/escalations_service';
import { ImpactPillsService } from './impact_pills_service';

const request = httpServerMock.createKibanaRequest();
const query = {
  origin: 'alertzero' as const,
  categories: ['respond', 'investigate'],
  decidedWithinHours: 72,
};

const makeService = ({
  open = new Map<string, number>(),
  closed = new Map<string, number>(),
  entityIds = new Map<string, Array<{ id: string; type?: string; name?: string }>>(),
  assertCanRead = jest.fn().mockResolvedValue(undefined),
  proposalsAvailable = true,
  getEntityStoreNames,
}: {
  open?: Map<string, number>;
  closed?: Map<string, number>;
  entityIds?: Map<string, Array<{ id: string; type?: string; name?: string }>>;
  assertCanRead?: jest.Mock;
  proposalsAvailable?: boolean;
  getEntityStoreNames?: jest.Mock;
} = {}) => {
  const countByConversation = jest.fn().mockResolvedValueOnce(open).mockResolvedValueOnce(closed);
  const getEntitiesByConversationId = jest.fn().mockResolvedValue(entityIds);
  const scanWithEntityIds = jest.fn();
  const service = new ImpactPillsService({
    getImpactClient: () => ({ getEntitiesByConversationId } as never),
    getSpaceId: () => 'space-1',
    getProposals: () =>
      proposalsAvailable
        ? ({
            getProposalPrivileges: () => ({ assertCanRead }),
            getProposalsService: () => ({ countByConversation }),
          } as unknown as ProposalsPluginStart)
        : undefined,
    getEscalationsService: () => ({ scanWithEntityIds } as unknown as EscalationsService),
    ...(getEntityStoreNames ? { getEntityStoreNames } : {}),
  });
  return { service, countByConversation, getEntitiesByConversationId, scanWithEntityIds };
};

describe('ImpactPillsService', () => {
  describe('forProposals', () => {
    it('counts the proposals of the open queue and the closed window per entity', async () => {
      const { service, countByConversation, getEntitiesByConversationId } = makeService({
        open: new Map([
          ['c1', 2],
          ['c2', 1],
        ]),
        closed: new Map([['c1', 1]]),
        entityIds: new Map([
          ['c1', [{ id: 'host-1', type: 'host', name: 'web-01' }]],
          ['c2', [{ id: 'host-1' }, { id: 'user-1' }]],
        ]),
      });

      const pills = await service.forProposals(request, query);

      expect(pills).toEqual([
        { entityId: 'host-1', count: 4, entityType: 'host', name: 'web-01' },
        { entityId: 'user-1', count: 1 },
      ]);
      expect(countByConversation).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          origin: 'alertzero',
          categories: ['respond', 'investigate'],
          status: 'pending',
          excludeSuperseded: true,
        }),
        'space-1',
        expect.any(Number)
      );
      expect(countByConversation).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ origin: 'alertzero', decidedWithinHours: 72 }),
        'space-1',
        expect.any(Number)
      );
      expect(getEntitiesByConversationId).toHaveBeenCalledWith(['c1', 'c2']);
    });

    it('leaves the closed window out when none is asked for', async () => {
      const { service, countByConversation } = makeService();

      await service.forProposals(request, { ...query, decidedWithinHours: undefined });

      expect(countByConversation).toHaveBeenCalledTimes(1);
    });

    it('returns no pills when the proposals plugin is unavailable', async () => {
      const { service } = makeService({ proposalsAvailable: false });

      expect(await service.forProposals(request, query)).toEqual([]);
    });

    it('refuses, rather than answering with no pills, when the caller cannot read proposals', async () => {
      const { service, countByConversation } = makeService({
        assertCanRead: jest.fn().mockRejectedValue(new Error('forbidden')),
      });

      await expect(service.forProposals(request, query)).rejects.toThrow('forbidden');
      expect(countByConversation).not.toHaveBeenCalled();
    });

    it('prefers the Entity Store name and does not look up ids that are not in the store', async () => {
      const getEntityStoreNames = jest.fn().mockResolvedValue(new Map([['host:abc', 'web-01']]));
      const { service } = makeService({
        open: new Map([['c1', 1]]),
        entityIds: new Map([
          [
            'c1',
            [
              { id: 'host:abc', type: 'host', name: 'snapshot' },
              { id: 'checkout', name: 'Checkout' },
            ],
          ],
        ]),
        getEntityStoreNames,
      });

      expect(await service.forProposals(request, query)).toEqual([
        { entityId: 'checkout', count: 1, name: 'Checkout' },
        { entityId: 'host:abc', count: 1, entityType: 'host', name: 'web-01' },
      ]);
      expect(getEntityStoreNames).toHaveBeenCalledWith(request, ['host:abc']);
    });

    it('lets a failed read surface, so the client keeps the pills it has', async () => {
      const { service, countByConversation } = makeService();
      countByConversation.mockReset().mockRejectedValue(new Error('es down'));

      await expect(service.forProposals(request, query)).rejects.toThrow('es down');
    });
  });

  describe('forEscalations', () => {
    it('counts each escalation once per entity across open and closed', async () => {
      const { service, scanWithEntityIds } = makeService();
      scanWithEntityIds
        .mockResolvedValueOnce([
          { id: 'e1', entity_ids: ['host-1', 'user-1'] },
          { id: 'e2', entity_ids: ['host-1'] },
        ])
        .mockResolvedValueOnce([{ id: 'e3' }, { id: 'e4', entity_ids: ['host-1'] }]);

      expect(await service.forEscalations(request)).toEqual([
        { entityId: 'host-1', count: 3 },
        { entityId: 'user-1', count: 1 },
      ]);
      expect(scanWithEntityIds).toHaveBeenCalledWith(request, { status: 'open' });
      expect(scanWithEntityIds).toHaveBeenCalledWith(request, { status: 'closed' });
    });

    it('labels a pill with the entity name carried on the escalation', async () => {
      const { service, scanWithEntityIds } = makeService();
      scanWithEntityIds.mockResolvedValueOnce([
        {
          id: 'e1',
          entity_ids: ['host:abc'],
          entity_types: { 'host:abc': 'host' },
          entity_names: { 'host:abc': 'web-01' },
        },
      ]);
      scanWithEntityIds.mockResolvedValueOnce([]);

      expect(await service.forEscalations(request)).toEqual([
        { entityId: 'host:abc', count: 1, entityType: 'host', name: 'web-01' },
      ]);
    });

    it('lets a failed scan surface', async () => {
      const { service, scanWithEntityIds } = makeService();
      scanWithEntityIds.mockRejectedValue(new Error('impact read failed'));

      await expect(service.forEscalations(request)).rejects.toThrow('impact read failed');
    });
  });
});

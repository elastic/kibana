/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { EscalationsService } from '../../escalations/services/escalations_service';
import { ImpactPillsService } from './impact_pills_service';
import { queryProposalPills } from './proposal_pills_query';

jest.mock('./proposal_pills_query');
const queryProposalPillsMock = jest.mocked(queryProposalPills);

const request = httpServerMock.createKibanaRequest();
const query = {
  origin: 'alertzero' as const,
  categories: ['respond', 'investigate'],
  decidedWithinHours: 72,
  from: 0,
  size: 10,
};

const makeService = ({
  assertCanRead = jest.fn().mockResolvedValue(undefined),
  assertCanReadInvestigations = jest.fn().mockResolvedValue(undefined),
  proposalsAvailable = true,
  labels = new Map<string, { type?: string; name?: string }>(),
  getEntityStoreNames,
}: {
  assertCanRead?: jest.Mock;
  assertCanReadInvestigations?: jest.Mock;
  proposalsAvailable?: boolean;
  labels?: Map<string, { type?: string; name?: string }>;
  getEntityStoreNames?: jest.Mock;
} = {}) => {
  const reconcileMappings = jest.fn().mockResolvedValue(undefined);
  const getEntityLabels = jest.fn().mockResolvedValue(labels);
  const scanWithEntityIds = jest.fn();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const service = new ImpactPillsService({
    esClient,
    logger: loggingSystemMock.createLogger(),
    getImpactService: () => ({ reconcileMappings, getEntityLabels } as never),
    privileges: { assertCanRead: assertCanReadInvestigations, assertCanManage: jest.fn() },
    getSpaceId: () => 'space-1',
    getProposals: () =>
      proposalsAvailable
        ? ({
            getProposalPrivileges: () => ({ assertCanRead }),
          } as unknown as ProposalsPluginStart)
        : undefined,
    getEscalationsService: () => ({ scanWithEntityIds } as unknown as EscalationsService),
    ...(getEntityStoreNames ? { getEntityStoreNames } : {}),
  });
  return { service, esClient, reconcileMappings, getEntityLabels, scanWithEntityIds };
};

describe('ImpactPillsService', () => {
  beforeEach(() => {
    queryProposalPillsMock.mockReset().mockResolvedValue({ rows: [], total: 0 });
  });

  describe('forProposals', () => {
    it('reads the requested page and reports how many pills remain', async () => {
      queryProposalPillsMock.mockResolvedValue({
        rows: [
          { entityId: 'host-1', count: 4 },
          { entityId: 'user-1', count: 1 },
        ],
        total: 25,
      });
      const { service, esClient, reconcileMappings } = makeService({
        labels: new Map([['host-1', { type: 'host', name: 'web-01' }]]),
      });

      const response = await service.forProposals(request, { ...query, from: 10, size: 2 });

      expect(response).toEqual({
        pills: [
          { entityId: 'host-1', count: 4, entityType: 'host', name: 'web-01' },
          { entityId: 'user-1', count: 1 },
        ],
        total: 25,
        remaining: 13,
      });
      expect(reconcileMappings).toHaveBeenCalled();
      expect(queryProposalPillsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          esClient,
          spaceId: 'space-1',
          origin: 'alertzero',
          categories: ['respond', 'investigate'],
          decidedWithinHours: 72,
          from: 10,
          size: 2,
        })
      );
    });

    it('labels only the ids of the page', async () => {
      queryProposalPillsMock.mockResolvedValue({
        rows: [{ entityId: 'host-1', count: 1 }],
        total: 1,
      });
      const { service, getEntityLabels } = makeService();

      await service.forProposals(request, query);

      expect(getEntityLabels).toHaveBeenCalledWith(['host-1'], 'space-1');
    });

    it('falls back to the Entity Store id prefix for the type of an unlabeled entity', async () => {
      queryProposalPillsMock.mockResolvedValue({
        rows: [{ entityId: 'user:root', count: 3 }],
        total: 1,
      });
      const { service } = makeService();

      expect((await service.forProposals(request, query)).pills).toEqual([
        { entityId: 'user:root', count: 3, entityType: 'user' },
      ]);
    });

    it('reports nothing remaining on the last page', async () => {
      queryProposalPillsMock.mockResolvedValue({
        rows: [{ entityId: 'host-1', count: 1 }],
        total: 11,
      });
      const { service } = makeService();

      expect(await service.forProposals(request, { ...query, from: 10 })).toMatchObject({
        total: 11,
        remaining: 0,
      });
    });

    it('returns no pills when the proposals plugin is unavailable', async () => {
      const { service } = makeService({ proposalsAvailable: false });

      expect(await service.forProposals(request, query)).toEqual({
        pills: [],
        total: 0,
        remaining: 0,
      });
      expect(queryProposalPillsMock).not.toHaveBeenCalled();
    });

    it('refuses, rather than answering with no pills, when the caller cannot read proposals', async () => {
      const { service } = makeService({
        assertCanRead: jest.fn().mockRejectedValue(new Error('forbidden')),
      });

      await expect(service.forProposals(request, query)).rejects.toThrow('forbidden');
      expect(queryProposalPillsMock).not.toHaveBeenCalled();
    });

    it('refuses when the caller cannot read investigations, even if they can read proposals', async () => {
      const { service } = makeService({
        assertCanReadInvestigations: jest.fn().mockRejectedValue(new Error('no investigations')),
      });

      await expect(service.forProposals(request, query)).rejects.toThrow('no investigations');
      expect(queryProposalPillsMock).not.toHaveBeenCalled();
    });

    it('prefers the Entity Store name and does not look up ids that are not in the store', async () => {
      queryProposalPillsMock.mockResolvedValue({
        rows: [
          { entityId: 'checkout', count: 1 },
          { entityId: 'host:abc', count: 1 },
        ],
        total: 2,
      });
      const getEntityStoreNames = jest.fn().mockResolvedValue(new Map([['host:abc', 'web-01']]));
      const { service } = makeService({
        labels: new Map([
          ['host:abc', { type: 'host', name: 'snapshot' }],
          ['checkout', { name: 'Checkout' }],
        ]),
        getEntityStoreNames,
      });

      expect((await service.forProposals(request, query)).pills).toEqual([
        { entityId: 'checkout', count: 1, name: 'Checkout' },
        { entityId: 'host:abc', count: 1, entityType: 'host', name: 'web-01' },
      ]);
      expect(getEntityStoreNames).toHaveBeenCalledWith(request, ['host:abc']);
    });

    it('lets a failed read surface, so the client keeps the pills it has', async () => {
      queryProposalPillsMock.mockRejectedValue(new Error('es down'));
      const { service } = makeService();

      await expect(service.forProposals(request, query)).rejects.toThrow('es down');
    });
  });

  describe('forEscalations', () => {
    const page = { from: 0, size: 10 };

    it('counts each escalation once per entity across open and closed', async () => {
      const { service, scanWithEntityIds } = makeService();
      scanWithEntityIds
        .mockResolvedValueOnce([
          { id: 'e1', entity_ids: ['host-1', 'user-1'] },
          { id: 'e2', entity_ids: ['host-1'] },
        ])
        .mockResolvedValueOnce([{ id: 'e3' }, { id: 'e4', entity_ids: ['host-1'] }]);

      expect(await service.forEscalations(request, page)).toEqual({
        pills: [
          { entityId: 'host-1', count: 3 },
          { entityId: 'user-1', count: 1 },
        ],
        total: 2,
        remaining: 0,
      });
      expect(scanWithEntityIds).toHaveBeenCalledWith(request, { status: 'open' });
      expect(scanWithEntityIds).toHaveBeenCalledWith(request, { status: 'closed' });
    });

    it('slices the requested page and reports how many pills remain', async () => {
      const { service, scanWithEntityIds } = makeService();
      scanWithEntityIds.mockResolvedValueOnce([
        { id: 'e1', entity_ids: ['host-1', 'user-1', 'user-2'] },
        { id: 'e2', entity_ids: ['host-1', 'user-1'] },
        { id: 'e3', entity_ids: ['host-1'] },
      ]);
      scanWithEntityIds.mockResolvedValueOnce([]);

      expect(await service.forEscalations(request, { from: 1, size: 1 })).toEqual({
        pills: [{ entityId: 'user-1', count: 2 }],
        total: 3,
        remaining: 1,
      });
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

      expect((await service.forEscalations(request, page)).pills).toEqual([
        { entityId: 'host:abc', count: 1, entityType: 'host', name: 'web-01' },
      ]);
    });

    it('lets a failed scan surface', async () => {
      const { service, scanWithEntityIds } = makeService();
      scanWithEntityIds.mockRejectedValue(new Error('impact read failed'));

      await expect(service.forEscalations(request, page)).rejects.toThrow('impact read failed');
    });
  });
});

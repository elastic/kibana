/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesIncrementalIdService } from '.';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createCasesEventBusMock } from '../../client/mocks';
import { INCREMENTAL_ID_ASSIGNED_TRIGGER_TTL_MS } from '../../../common/constants/incremental_id';

describe('CasesIncrementalIdService', () => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();
  let service: CasesIncrementalIdService;

  beforeEach(() => {
    service = new CasesIncrementalIdService(savedObjectsClient, mockLogger);
  });

  describe('getLastAppliedIdForSpace', () => {
    it('should return the last applied id for the space', async () => {
      const LAST_APPLIED_ID = 101;
      const spaceId = 'spaceId';
      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [
          // @ts-expect-error: SO client types are not correct
          {
            attributes: {
              incremental_id: LAST_APPLIED_ID,
            },
          },
        ],
      });

      const result = await service.getLastAppliedIdForSpace(spaceId);

      expect(result).toEqual(LAST_APPLIED_ID);
      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        filter: CasesIncrementalIdService.incrementalIdExistsFilter,
        type: CASE_SAVED_OBJECT,
        perPage: 1,
        page: 1,
        namespaces: [spaceId],
        sortField: 'incremental_id',
        sortOrder: 'desc',
      });
    });

    it('should return 0 if no cases could be found', async () => {
      const spaceId = 'spaceId';
      // @ts-expect-error: SO client types are not correct
      savedObjectsClient.find.mockResolvedValue({
        total: 0,
      });

      const result = await service.getLastAppliedIdForSpace(spaceId);

      expect(result).toEqual(0);
    });

    it('should return 0 if the case is missing incremental_id', async () => {
      const spaceId = 'spaceId';
      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [
          // @ts-expect-error: SO client types are not correct
          {
            attributes: {},
          },
        ],
      });

      const result = await service.getLastAppliedIdForSpace(spaceId);

      expect(result).toEqual(0);
    });
  });

  describe('getOrCreateCaseIdIncrementerSo', () => {
    it('should return the incrementer SO when the incremental IDs match', async () => {
      const lastId = 100;
      const incIdSo = { attributes: { last_id: lastId } };
      service.getLastAppliedIdForSpace = jest.fn().mockReturnValue(lastId);
      service.getCaseIdIncrementerSo = jest.fn().mockReturnValue({
        total: 1,
        saved_objects: [incIdSo],
      });
      const result = await service.getOrCreateCaseIdIncrementerSo('random');
      expect(result).toStrictEqual(incIdSo);
    });

    it('should return the incrementer SO even if `last_id` is 0', async () => {
      const lastId = 0;
      const incIdSo = { attributes: { last_id: lastId } };
      service.getLastAppliedIdForSpace = jest.fn().mockReturnValue(lastId);
      service.getCaseIdIncrementerSo = jest.fn().mockReturnValue({
        total: 1,
        saved_objects: [incIdSo],
      });
      const result = await service.getOrCreateCaseIdIncrementerSo('random');
      expect(result).toStrictEqual(incIdSo);
    });

    it('should increase and persist `last_id` in case the last applied ID to a case is higher than in the inc ID SO', async () => {
      const incIdLastId = 100;
      const lastAppliedId = 5610;
      const incIdSo = { attributes: { last_id: incIdLastId } };
      service.getLastAppliedIdForSpace = jest.fn().mockReturnValue(lastAppliedId);
      service.getCaseIdIncrementerSo = jest.fn().mockReturnValue({
        total: 1,
        saved_objects: [incIdSo],
      });
      service.incrementCounterSO = jest.fn().mockImplementation(service.incrementCounterSO);
      const result = await service.getOrCreateCaseIdIncrementerSo('random');
      expect(result.attributes.last_id).toBe(lastAppliedId);
      expect(service.incrementCounterSO).toHaveBeenCalledWith(incIdSo, lastAppliedId, 'random');
    });

    it('should not increase `last_id` and not persist in case the last applied ID to a case is lower than in the inc ID SO', async () => {
      const incIdLastId = 200;
      const lastAppliedId = 100;
      const incIdSo = { attributes: { last_id: incIdLastId } };
      service.getLastAppliedIdForSpace = jest.fn().mockReturnValue(lastAppliedId);
      service.getCaseIdIncrementerSo = jest.fn().mockReturnValue({
        total: 1,
        saved_objects: [incIdSo],
      });
      service.incrementCounterSO = jest.fn().mockImplementation(service.incrementCounterSO);
      const result = await service.getOrCreateCaseIdIncrementerSo('random');
      expect(result.attributes.last_id).toBe(incIdLastId);
      expect(service.incrementCounterSO).not.toHaveBeenCalled();
    });

    it('should initiate the resolution of multiple inc ID SOs', async () => {
      const lastId = 100;
      const incIdSo = { attributes: { last_id: lastId } };
      service.getLastAppliedIdForSpace = jest.fn().mockReturnValue(lastId);
      service.getCaseIdIncrementerSo = jest.fn().mockReturnValue({
        total: 2,
        saved_objects: [incIdSo, incIdSo],
      });
      service.resolveMultipleIncrementerSO = jest.fn();
      await service.getOrCreateCaseIdIncrementerSo('random');
      expect(service.resolveMultipleIncrementerSO).toHaveBeenCalled();
    });
  });

  describe('resolveMultipleIncrementerSO', () => {
    it('should return the correct incrementer SO', async () => {
      const so1 = { attributes: { last_id: 10 } };
      const so2 = { attributes: { last_id: 100 } };
      const so3 = { attributes: { last_id: 1000 } };
      const incrementerSOs = [so1, so2, so3];

      // @ts-expect-error: SO client types are not correct
      const result = await service.resolveMultipleIncrementerSO(incrementerSOs, 20, 'default');

      expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith([so1, so2]);
      expect(result.attributes.last_id).toBe(so3.attributes.last_id);
    });

    it('should return the correct incrementer SO when SOs come in a random order', async () => {
      const so1 = { attributes: { last_id: 10 } };
      const so2 = { attributes: { last_id: 100 } };
      const so3 = { attributes: { last_id: 1000 } };
      const incrementerSOs = [so1, so3, so2];

      // @ts-expect-error: SO client types are not correct
      const result = await service.resolveMultipleIncrementerSO(incrementerSOs, 20, 'default');

      expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith([so1, so2]);
      expect(result.attributes.last_id).toBe(so3.attributes.last_id);
    });

    it("should update the incrementer SO's count when `lastAppliedId` is bigger than it's `last_id`", async () => {
      const so1 = { attributes: { last_id: 10 } };
      const so2 = { attributes: { last_id: 100 } };
      const so3 = { attributes: { last_id: 1000 } };
      const incrementerSOs = [so3, so1, so2];

      service.incrementCounterSO = jest.fn();

      // @ts-expect-error: SO client types are not correct
      await service.resolveMultipleIncrementerSO(incrementerSOs, 20000, 'default');

      expect(service.incrementCounterSO).toHaveBeenCalledWith(so3, 20000, 'default');
    });

    it('should create a new incrementer SO when no max could be found', async () => {
      const incrementerSOs: unknown = [];

      service.createCaseIdIncrementerSo = jest.fn();

      // @ts-expect-error: SO client types are not correct
      await service.resolveMultipleIncrementerSO(incrementerSOs, 20000, 'default');

      expect(service.createCaseIdIncrementerSo).toHaveBeenCalledWith('default', 20000);
    });
  });

  describe('incrementCaseIds', () => {
    function getTestCases() {
      return [
        { attributes: {}, namespaces: ['default'] },
        { attributes: {}, namespaces: ['second-life'] },
        { attributes: {}, namespaces: ['second-life'] },
        { attributes: {}, namespaces: ['default'] },
        { attributes: {}, namespaces: ['second-life'] },
      ];
    }
    let cases: ReturnType<typeof getTestCases> = [];
    let defaultIncIdSo = { attributes: { last_id: 100 } };
    let secondLifeIncIdSo = { attributes: { last_id: 10 } };

    beforeEach(() => {
      defaultIncIdSo = { attributes: { last_id: 100 } };
      secondLifeIncIdSo = { attributes: { last_id: 10 } };
      cases = getTestCases();
      service.getOrCreateCaseIdIncrementerSo = jest.fn().mockImplementation((namespace) => {
        switch (namespace) {
          case 'default':
            return defaultIncIdSo;
          case 'second-life':
            return secondLifeIncIdSo;
        }
      });
      // mock out persistence, their logic is tested individually
      service.applyIncrementalIdToCaseSo = jest.fn().mockResolvedValue(null);
      service.incrementCounterSO = jest.fn().mockResolvedValue(null);
    });

    it('should increment the incremental case ids and inc id SOs correctly', async () => {
      // @ts-expect-error: case SO types are not correct
      await service.incrementCaseIds(cases);

      // These calls need to be tested in order
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenNthCalledWith(
        1,
        cases[0],
        101,
        'default'
      );
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenNthCalledWith(
        2,
        cases[1],
        11,
        'second-life'
      );
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenNthCalledWith(
        3,
        cases[2],
        12,
        'second-life'
      );
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenNthCalledWith(
        4,
        cases[3],
        102,
        'default'
      );
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenNthCalledWith(
        5,
        cases[4],
        13,
        'second-life'
      );

      // For these, the order of calls does not matter
      expect(service.incrementCounterSO).toHaveBeenCalledWith(defaultIncIdSo, 102, 'default');
      expect(service.incrementCounterSO).toHaveBeenCalledWith(secondLifeIncIdSo, 13, 'second-life');
    });

    it('should not start processing when the service was stopped', async () => {
      service.stopService();
      // @ts-expect-error: case SO types are not correct
      await service.incrementCaseIds(cases);
      expect(service.applyIncrementalIdToCaseSo).not.toHaveBeenCalled();
      expect(service.incrementCounterSO).not.toHaveBeenCalled();
    });

    it('should stop processing when service was stopped mid-processing', async () => {
      // This test simulates the service being stopped while it's processing.
      // Each `mockImplementationOnce` represents the processing step of one of the cases.
      // The first resolves, the second one is started, then the service is stopped and it resolves.
      // The third one is not reached.
      service.applyIncrementalIdToCaseSo = jest
        .fn()
        .mockImplementationOnce(() => Promise.resolve(null))
        .mockImplementationOnce(() => {
          // the service is stopped before this case could be written
          service.stopService();
          return Promise.resolve();
        })
        .mockImplementationOnce(() => Promise.resolve(null));

      // @ts-expect-error: case SO types are not correct
      await service.incrementCaseIds([cases[0], cases[1], cases[2]]);
      // The service was stopped asynchronously while the second case was writing.
      // Therefore it should have stopped, and not processed the third case.
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenCalledTimes(3);
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenNthCalledWith(
        1,
        cases[0],
        101,
        'default'
      );
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenNthCalledWith(
        2,
        cases[1],
        11,
        'second-life'
      );
      // The third call is to reset the incremental ID of the previous write
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenNthCalledWith(
        3,
        cases[1],
        null,
        'second-life'
      );
      // The service is stopped and increment counter SOs are not updated
      expect(service.incrementCounterSO).not.toHaveBeenCalled();
    });

    it('should skip processing a case when it has no namespace attached', async () => {
      // @ts-expect-error: case SO types are not correct
      await service.incrementCaseIds([cases[0], cases[1], {}, cases[2]]);

      // called 3 times, even though 4 SOs have been passed
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenCalledTimes(3);
    });

    it('should stop processing when it was not possible to get or create an incrementer SO', async () => {
      service.getOrCreateCaseIdIncrementerSo = jest.fn().mockRejectedValue(null);

      // @ts-expect-error: case SO types are not correct
      await service.incrementCaseIds(cases);

      expect(service.applyIncrementalIdToCaseSo).not.toHaveBeenCalled();
    });

    it('should stop processing when it was not possible to increment a case id', async () => {
      service.applyIncrementalIdToCaseSo = jest.fn().mockRejectedValue(null);

      // @ts-expect-error: case SO types are not correct
      await service.incrementCaseIds(cases);

      // Only called once, when it rejected
      expect(service.applyIncrementalIdToCaseSo).toHaveBeenCalledTimes(1);
    });
  });
  describe('incrementCaseIds events', () => {
    const HOUR = 60 * 60 * 1000;
    const createdAt = new Date(Date.now() - HOUR).toISOString();
    const caseSo = (id: string, namespace = 'default', created = createdAt) => ({
      id,
      attributes: { created_at: created },
      namespaces: [namespace],
    });
    let casesEventBus: ReturnType<typeof createCasesEventBusMock>;
    let eventService: CasesIncrementalIdService;

    beforeEach(() => {
      casesEventBus = createCasesEventBusMock();
      eventService = new CasesIncrementalIdService(savedObjectsClient, mockLogger, casesEventBus);
      eventService.getOrCreateCaseIdIncrementerSo = jest
        .fn()
        .mockResolvedValue({ attributes: { last_id: 0 } });
      eventService.applyIncrementalIdToCaseSo = jest.fn().mockResolvedValue(null);
      eventService.incrementCounterSO = jest.fn().mockResolvedValue(null);
    });

    it('emits a single event for the whole batch', async () => {
      // @ts-expect-error: case SO types are not correct
      await eventService.incrementCaseIds([caseSo('a'), caseSo('b'), caseSo('c', 'other')]);

      expect(casesEventBus.emitIncrementalIdsAssigned).toHaveBeenCalledTimes(1);
      expect(casesEventBus.emitIncrementalIdsAssigned).toHaveBeenCalledWith({
        caseIds: ['a', 'b', 'c'],
      });
    });

    it('only reports cases created within the trigger TTL, but still assigns IDs to all', async () => {
      const old = new Date(
        Date.now() - INCREMENTAL_ID_ASSIGNED_TRIGGER_TTL_MS - HOUR
      ).toISOString();

      // @ts-expect-error: case SO types are not correct
      await eventService.incrementCaseIds([caseSo('old', 'default', old), caseSo('recent')]);

      expect(eventService.applyIncrementalIdToCaseSo).toHaveBeenCalledTimes(2);
      expect(casesEventBus.emitIncrementalIdsAssigned).toHaveBeenCalledWith({
        caseIds: ['recent'],
      });
    });

    it('does not emit when only old cases were assigned', async () => {
      const old = new Date(
        Date.now() - INCREMENTAL_ID_ASSIGNED_TRIGGER_TTL_MS - HOUR
      ).toISOString();

      // @ts-expect-error: case SO types are not correct
      await eventService.incrementCaseIds([caseSo('old', 'default', old)]);

      expect(casesEventBus.emitIncrementalIdsAssigned).not.toHaveBeenCalled();
    });

    it('does not emit caseUpdated', async () => {
      // @ts-expect-error: case SO types are not correct
      await eventService.incrementCaseIds([caseSo('a')]);

      expect(casesEventBus.emitCaseUpdated).not.toHaveBeenCalled();
    });

    it('does not emit when nothing was assigned', async () => {
      await eventService.incrementCaseIds([]);

      expect(casesEventBus.emitIncrementalIdsAssigned).not.toHaveBeenCalled();
    });

    it('skips cases without a namespace', async () => {
      // @ts-expect-error: case SO types are not correct
      await eventService.incrementCaseIds([{ id: 'no-ns', attributes: {} }, caseSo('a')]);

      expect(casesEventBus.emitIncrementalIdsAssigned).toHaveBeenCalledWith({
        caseIds: ['a'],
      });
    });

    it('only reports the cases that were assigned before an error stopped the loop', async () => {
      eventService.applyIncrementalIdToCaseSo = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('boom'));

      // @ts-expect-error: case SO types are not correct
      await eventService.incrementCaseIds([caseSo('a'), caseSo('b'), caseSo('c')]);

      expect(casesEventBus.emitIncrementalIdsAssigned).toHaveBeenCalledWith({
        caseIds: ['a'],
      });
    });

    it('does not report a case whose ID was reset because the service was stopped', async () => {
      eventService.applyIncrementalIdToCaseSo = jest.fn().mockImplementationOnce(() => {
        eventService.stopService();
        return Promise.resolve();
      });

      // @ts-expect-error: case SO types are not correct
      await eventService.incrementCaseIds([caseSo('a')]);

      expect(casesEventBus.emitIncrementalIdsAssigned).not.toHaveBeenCalled();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import stringify from 'json-stable-stringify';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { CasesOracleService } from './cases_oracle_service';
import { CASE_RULES_SAVED_OBJECT } from '../../../common/constants';
import { isEmpty } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

describe('CasesOracleService', () => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const logger = loggingSystemMock.createLogger();

  let service: CasesOracleService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CasesOracleService({ savedObjectsClient, logger });
  });

  describe('getRecordId', () => {
    it('return the record ID correctly', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = { 'host.ip': '0.0.0.1' };

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(grouping)}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner, grouping })).toEqual(hex);
    });

    it('sorts the grouping definition correctly', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };
      const sortedGrouping = { 'agent.id': '8a4f500d', 'host.ip': '0.0.0.1' };

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(sortedGrouping)}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner, grouping })).toEqual(hex);
    });

    it('return the record ID correctly without grouping', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';

      const payload = `${ruleId}:${spaceId}:${owner}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner })).toEqual(hex);
    });

    it('return the record ID correctly with empty grouping', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = {};

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(grouping)}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner, grouping })).toEqual(hex);
    });

    it('return the record ID correctly without rule', async () => {
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = { 'host.ip': '0.0.0.1' };

      const payload = `${spaceId}:${owner}:${stringify(grouping)}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ spaceId, owner, grouping })).toEqual(hex);
    });

    it('throws an error when the ruleId and the grouping is missing', async () => {
      const spaceId = 'default';
      const owner = 'cases';

      // @ts-expect-error: ruleId and grouping are omitted for testing
      expect(() => service.getRecordId({ spaceId, owner })).toThrowErrorMatchingInlineSnapshot(
        `"ruleID or grouping is required"`
      );
    });

    it.each(['ruleId', 'spaceId', 'owner'])(
      'return the record ID correctly with empty string for %s',
      async (key) => {
        const getPayloadValue = (value: string) => (isEmpty(value) ? '' : `${value}:`);

        const params = {
          ruleId: 'test-rule-id',
          spaceId: 'default',
          owner: 'cases',
        };

        const grouping = { 'host.ip': '0.0.0.1' };

        set(params, key, '');

        const payload = `${getPayloadValue(params.ruleId)}${getPayloadValue(
          params.spaceId
        )}${getPayloadValue(params.owner)}${stringify(grouping)}`;

        const hash = createHash('sha256');

        hash.update(payload);

        const hex = hash.digest('hex');

        expect(service.getRecordId({ ...params, grouping })).toEqual(hex);
      }
    );

    it('constructs a record ID with special characters correctly', async () => {
      const ruleId = `{}=:&".'/{}}`;
      const spaceId = 'default:';
      const owner = 'cases{';
      const grouping = { '{:}': `{}=:&".'/{}}` };

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(grouping)}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner, grouping })).toEqual(hex);
    });
  });

  describe('getRecord', () => {
    const rules = [{ id: 'test-rule-id' }];
    const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };

    const oracleSO = {
      id: 'so-id',
      version: 'so-version',
      attributes: {
        counter: 1,
        rules,
        grouping,
        createdAt: '2023-10-10T10:23:42.769Z',
        updatedAt: '2023-10-10T10:23:42.769Z',
      },
      type: CASE_RULES_SAVED_OBJECT,
      references: [],
    };

    beforeEach(() => {
      savedObjectsClient.get.mockResolvedValue(oracleSO);
    });

    it('gets a record correctly', async () => {
      const record = await service.getRecord('so-id');

      expect(record).toEqual({ ...oracleSO.attributes, id: 'so-id', version: 'so-version' });
    });

    it('calls the savedObjectsClient.get method correctly', async () => {
      await service.getRecord('so-id');

      expect(savedObjectsClient.get).toHaveBeenCalledWith('cases-rules', 'so-id');
    });
  });

  describe('bulkGetRecord', () => {
    const rules = [{ id: 'test-rule-id' }];
    const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };

    const bulkGetSOs = [
      {
        id: 'so-id',
        version: 'so-version',
        attributes: {
          counter: 1,
          rules,
          grouping,
          createdAt: '2023-10-10T10:23:42.769Z',
          updatedAt: '2023-10-10T10:23:42.769Z',
        },
        type: CASE_RULES_SAVED_OBJECT,
        references: [],
      },
      {
        id: 'so-id-2',
        type: CASE_RULES_SAVED_OBJECT,
        error: {
          message: 'Not found',
          statusCode: 404,
          error: 'Not found',
        },
      },
    ];

    beforeEach(() => {
      // @ts-expect-error: types of the SO client are wrong and they do not accept errors
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: bulkGetSOs });
    });

    it('formats the response correctly', async () => {
      const res = await service.bulkGetRecords(['so-id', 'so-id-2']);

      expect(res).toEqual([
        { ...bulkGetSOs[0].attributes, id: 'so-id', version: 'so-version' },
        { ...bulkGetSOs[1].error, id: 'so-id-2' },
      ]);
    });

    it('calls the savedObjectsClient.bulkGet method correctly', async () => {
      await service.bulkGetRecords(['so-id', 'so-id-2']);

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { id: 'so-id', type: 'cases-rules' },
        { id: 'so-id-2', type: 'cases-rules' },
      ]);
    });

    it('does not call the savedObjectsClient if the input is an empty array', async () => {
      await service.bulkGetRecords([]);

      expect(savedObjectsClient.bulkGet).not.toHaveBeenCalledWith();
    });
  });

  describe('createRecord', () => {
    const rules = [{ id: 'test-rule-id' }];
    const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };

    const oracleSO = {
      id: 'so-id',
      version: 'so-version',
      attributes: {
        counter: 1,
        rules,
        grouping,
        createdAt: '2023-10-10T10:23:42.769Z',
        updatedAt: '2023-10-10T10:23:42.769Z',
      },
      type: CASE_RULES_SAVED_OBJECT,
      references: [],
    };

    beforeEach(() => {
      savedObjectsClient.create.mockResolvedValue(oracleSO);
    });

    it('creates a record correctly', async () => {
      const record = await service.createRecord('so-id', { rules, grouping });

      expect(record).toEqual({ ...oracleSO.attributes, id: 'so-id', version: 'so-version' });
    });

    it('calls the savedObjectsClient.create method correctly', async () => {
      const id = 'so-id';

      await service.createRecord(id, { rules, grouping });

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        'cases-rules',
        {
          counter: 1,
          createdAt: expect.anything(),
          rules,
          grouping,
          updatedAt: null,
        },
        {
          id,
          references: [
            {
              id: 'test-rule-id',
              name: 'associated-alert',
              type: 'alert',
            },
          ],
        }
      );
    });
  });

  describe('bulkCreateRecord', () => {
    const rules = [{ id: 'test-rule-id' }];
    const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };

    const bulkCreateSOs = [
      {
        id: 'so-id',
        version: 'so-version',
        attributes: {
          counter: 1,
          rules,
          grouping,
          createdAt: '2023-10-10T10:23:42.769Z',
          updatedAt: '2023-10-10T10:23:42.769Z',
        },
        type: CASE_RULES_SAVED_OBJECT,
        references: [],
      },
      {
        id: 'so-id-2',
        type: CASE_RULES_SAVED_OBJECT,
        error: {
          message: 'Not found',
          statusCode: 404,
          error: 'Not found',
        },
      },
    ];

    beforeEach(() => {
      // @ts-expect-error: types of the SO client are wrong and they do not accept errors
      savedObjectsClient.bulkCreate.mockResolvedValue({ saved_objects: bulkCreateSOs });
    });

    it('formats the response correctly', async () => {
      const res = await service.bulkCreateRecord([
        { recordId: 'so-id', payload: { rules, grouping } },
        { recordId: 'so-id-2', payload: { rules, grouping } },
      ]);

      expect(res).toEqual([
        { ...bulkCreateSOs[0].attributes, id: 'so-id', version: 'so-version' },
        { ...bulkCreateSOs[1].error, id: 'so-id-2' },
      ]);
    });

    it('calls the bulkCreate correctly', async () => {
      await service.bulkCreateRecord([
        { recordId: 'so-id', payload: { rules, grouping } },
        { recordId: 'so-id-2', payload: { rules, grouping } },
      ]);

      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith([
        {
          attributes: {
            rules,
            grouping,
            counter: 1,
            createdAt: expect.anything(),
            updatedAt: null,
          },
          id: 'so-id',
          type: 'cases-rules',
          references: [
            {
              id: 'test-rule-id',
              name: 'associated-alert',
              type: 'alert',
            },
          ],
        },
        {
          attributes: {
            rules,
            grouping,
            counter: 1,
            createdAt: expect.anything(),
            updatedAt: null,
          },
          id: 'so-id-2',
          type: 'cases-rules',
          references: [
            {
              id: 'test-rule-id',
              name: 'associated-alert',
              type: 'alert',
            },
          ],
        },
      ]);
    });

    it('does not call the savedObjectsClient if the input is an empty array', async () => {
      await service.bulkCreateRecord([]);

      expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalledWith();
    });
  });

  describe('increaseCounter', () => {
    const rules = [{ id: 'test-rule-id' }];
    const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };

    const oracleSO = {
      id: 'so-id',
      version: 'so-version',
      attributes: {
        counter: 1,
        rules,
        grouping,
        createdAt: '2023-10-10T10:23:42.769Z',
        updatedAt: '2023-10-10T10:23:42.769Z',
      },
      type: CASE_RULES_SAVED_OBJECT,
      references: [],
    };

    const oracleSOWithIncreasedCounter = {
      ...oracleSO,
      attributes: { ...oracleSO.attributes, counter: 2 },
    };

    beforeEach(() => {
      savedObjectsClient.get.mockResolvedValue(oracleSO);
      savedObjectsClient.update.mockResolvedValue(oracleSOWithIncreasedCounter);
    });

    it('increases the counter correctly', async () => {
      const record = await service.increaseCounter('so-id');

      expect(record).toEqual({
        ...oracleSO.attributes,
        id: 'so-id',
        version: 'so-version',
        counter: 2,
      });
    });

    it('calls the savedObjectsClient.update method correctly', async () => {
      await service.increaseCounter('so-id');

      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        'cases-rules',
        'so-id',
        {
          counter: 2,
        },
        { version: 'so-version' }
      );
    });
  });

  describe('bulkUpdateRecord', () => {
    const bulkUpdateSOs = [
      {
        id: 'so-id',
        version: 'so-version',
        attributes: {
          counter: 1,
          rules: [],
          grouping: {},
          createdAt: '2023-10-10T10:23:42.769Z',
          updatedAt: '2023-10-10T10:23:42.769Z',
        },
        type: CASE_RULES_SAVED_OBJECT,
        references: [],
      },
      {
        id: 'so-id-2',
        type: CASE_RULES_SAVED_OBJECT,
        error: {
          message: 'Conflict',
          statusCode: 409,
          error: 'Conflict',
        },
      },
    ];

    beforeEach(() => {
      // @ts-expect-error: types of the SO client are wrong and they do not accept errors
      savedObjectsClient.bulkUpdate.mockResolvedValue({ saved_objects: bulkUpdateSOs });
    });

    it('formats the response correctly', async () => {
      const res = await service.bulkUpdateRecord([
        { recordId: 'so-id', version: 'so-version-1', payload: { counter: 2 } },
        { recordId: 'so-id-2', version: 'so-version-22', payload: { counter: 3 } },
      ]);

      expect(res).toEqual([
        { ...bulkUpdateSOs[0].attributes, id: 'so-id', version: 'so-version' },
        { ...bulkUpdateSOs[1].error, id: 'so-id-2' },
      ]);
    });

    it('calls the bulkUpdateRecord correctly', async () => {
      await service.bulkUpdateRecord([
        { recordId: 'so-id', version: 'so-version-1', payload: { counter: 2 } },
        { recordId: 'so-id-2', version: 'so-version-2', payload: { counter: 3 } },
      ]);

      expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
        {
          attributes: {
            counter: 2,
            updatedAt: expect.anything(),
          },
          id: 'so-id',
          version: 'so-version-1',
          type: 'cases-rules',
        },
        {
          attributes: {
            counter: 3,
            updatedAt: expect.anything(),
          },
          id: 'so-id-2',
          version: 'so-version-2',
          type: 'cases-rules',
        },
      ]);
    });

    it('does not call the savedObjectsClient if the input is an empty array', async () => {
      await service.bulkUpdateRecord([]);

      expect(savedObjectsClient.bulkUpdate).not.toHaveBeenCalledWith();
    });
  });
});

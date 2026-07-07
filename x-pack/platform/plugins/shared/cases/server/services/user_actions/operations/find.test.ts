/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { UserActionFinder } from './find';
import { V2_NOOP_ACTIVITY_WRITER } from '../../../cases_analytics_v2';
import { createSavedObjectsSerializerMock } from '../../../client/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import {
  createConnectorUserAction,
  createUserActionFindSO,
  createUserActionSO,
} from '../test_utils';
import { createSOFindResponse, mockPointInTimeFinder } from '../../test_utils';
import { omit } from 'lodash';
import type { SavedObjectsFindResponse } from '@kbn/core/server';

describe('UserActionsService: Finder', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();
  const auditMockLocker = auditLoggerMock.create();
  const savedObjectsSerializer = createSavedObjectsSerializerMock();

  const attributesToValidateIfMissing = ['created_at', 'created_by', 'owner', 'action', 'payload'];

  let finder: UserActionFinder;

  beforeEach(() => {
    jest.resetAllMocks();
    finder = new UserActionFinder({
      log: mockLogger,
      unsecuredSavedObjectsClient,
      savedObjectsSerializer,
      auditLogger: auditMockLocker,
      analyticsV2ActivityWriter: V2_NOOP_ACTIVITY_WRITER,
    });
  });

  const mockFind = (soFindRes: SavedObjectsFindResponse) => {
    unsecuredSavedObjectsClient.find.mockResolvedValue(soFindRes);
  };

  const mockFinder = (soFindRes: SavedObjectsFindResponse) =>
    mockPointInTimeFinder(unsecuredSavedObjectsClient)(soFindRes);

  const decodingTests: Array<
    ['find' | 'findAll' | 'findStatusChanges', (soFindRes: SavedObjectsFindResponse) => void]
  > = [
    ['find', mockFind],
    ['findAll', mockFinder],
    ['findStatusChanges', mockFinder],
  ];

  describe('find', () => {
    it('sets the comment_id to null if it is omitted', async () => {
      const userAction = createUserActionSO();
      const attributes = omit({ ...userAction.attributes }, 'comment_id');
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      mockFind(soFindRes);

      const res = await finder.find({ caseId: '1' });
      const commentId = res.saved_objects[0].attributes.comment_id;

      expect(commentId).toBe(null);
    });

    describe('types filter', () => {
      beforeEach(() => {
        const userAction = createUserActionSO();
        const soFindRes = createSOFindResponse([createUserActionFindSO(userAction)]);
        mockFind(soFindRes);
      });

      it('filters by type=comment and action=create when types includes "user"', async () => {
        await finder.find({ caseId: '1', types: ['user'] });

        expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: expect.objectContaining({
              arguments: expect.arrayContaining([
                expect.objectContaining({
                  arguments: expect.arrayContaining([
                    expect.objectContaining({
                      value: 'cases-user-actions.attributes.type',
                    }),
                    expect.objectContaining({
                      value: 'comment',
                    }),
                  ]),
                }),
                expect.objectContaining({
                  arguments: expect.arrayContaining([
                    expect.objectContaining({
                      value: 'cases-user-actions.attributes.action',
                    }),
                    expect.objectContaining({
                      value: 'create',
                    }),
                  ]),
                }),
              ]),
            }),
          })
        );
      });
    });

    describe('author filter', () => {
      beforeEach(() => {
        const userAction = createUserActionSO();
        const soFindRes = createSOFindResponse([createUserActionFindSO(userAction)]);
        mockFind(soFindRes);
      });

      it('applies author filter on created_by.username', async () => {
        await finder.find({ caseId: '1', author: 'testuser' });

        expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: expect.objectContaining({
              type: 'function',
              function: 'is',
              arguments: expect.arrayContaining([
                expect.objectContaining({
                  value: 'cases-user-actions.attributes.created_by.username',
                }),
                expect.objectContaining({
                  value: 'testuser',
                }),
              ]),
            }),
          })
        );
      });

      it('does not apply author filter when author is not provided', async () => {
        await finder.find({ caseId: '1' });

        const callFilter = unsecuredSavedObjectsClient.find.mock.calls[0][0].filter;
        expect(callFilter).toBeUndefined();
      });

      /**
       * `username` is not guaranteed to be set on `created_by` (e.g. API key
       * authenticated requests only reliably populate `profile_uid`, see
       * `CasesClientFactory.getUserInfo`). Filtering by `author` is username-based,
       * so such user actions simply won't match the filter — this test guards
       * against that scenario ever throwing or otherwise breaking the response,
       * even though it's a known limitation that those user actions can't
       * currently be found via the `author` filter.
       */
      it('does not throw when a user action has a null created_by.username', async () => {
        const userAction = createUserActionSO({
          attributesOverrides: {
            created_by: { email: 'a', username: null, full_name: 'abc', profile_uid: 'uid-1' },
          },
        });
        mockFind(createSOFindResponse([createUserActionFindSO(userAction)]));

        await expect(finder.find({ caseId: '1', author: 'testuser' })).resolves.toEqual(
          expect.objectContaining({
            saved_objects: expect.arrayContaining([
              expect.objectContaining({
                attributes: expect.objectContaining({
                  created_by: expect.objectContaining({ username: null }),
                }),
              }),
            ]),
          })
        );
      });
    });
  });

  describe('findAll', () => {
    it('uses createPointInTimeFinder to fetch all user actions', async () => {
      const userAction = createUserActionSO();
      const soFindRes = createSOFindResponse([createUserActionFindSO(userAction)]);
      mockFinder(soFindRes);

      const res = await finder.findAll({ caseId: '1' });

      expect(unsecuredSavedObjectsClient.createPointInTimeFinder).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('applies author filter in findAll', async () => {
      const userAction = createUserActionSO();
      const soFindRes = createSOFindResponse([createUserActionFindSO(userAction)]);
      mockFinder(soFindRes);

      await finder.findAll({ caseId: '1', author: 'testuser' });

      expect(unsecuredSavedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            type: 'function',
            function: 'is',
            arguments: expect.arrayContaining([
              expect.objectContaining({
                value: 'cases-user-actions.attributes.created_by.username',
              }),
              expect.objectContaining({
                value: 'testuser',
              }),
            ]),
          }),
        })
      );
    });

    it('stops fetching once the limit is reached and closes the PIT early', async () => {
      const close = jest.fn();
      const batch = (count: number) =>
        createSOFindResponse(
          Array.from({ length: count }, () => createUserActionFindSO(createUserActionSO()))
        );

      unsecuredSavedObjectsClient.createPointInTimeFinder.mockReturnValue({
        close,
        // @ts-expect-error
        find: function* asyncGenerator() {
          yield batch(3);
          yield batch(3);
          yield batch(3);
        },
      });

      const res = await finder.findAll({ caseId: '1', limit: 4 });

      expect(res).toHaveLength(4);
      expect(close).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Reached the limit of 4 user actions')
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('case id: 1'));
    });

    it('does not warn when the limit is not reached', async () => {
      const userAction = createUserActionSO();
      const soFindRes = createSOFindResponse([createUserActionFindSO(userAction)]);
      mockFinder(soFindRes);

      await finder.findAll({ caseId: '1', limit: 10 });

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('skips decoding when decode is false, allowing otherwise-invalid attributes through', async () => {
      const invalidUserAction = createUserActionSO({
        type: 'title',
        payload: {},
      });
      mockFinder(createSOFindResponse([createUserActionFindSO(invalidUserAction)]));

      await expect(finder.findAll({ caseId: '1' })).rejects.toThrow();

      mockFinder(createSOFindResponse([createUserActionFindSO(invalidUserAction)]));

      const res = await finder.findAll({ caseId: '1', decode: false });
      expect(res).toHaveLength(1);
      expect(res[0].attributes).toEqual(expect.objectContaining({ type: 'title', payload: {} }));
    });

    it('does not cap results when no limit is provided', async () => {
      const batch = (count: number) =>
        createSOFindResponse(
          Array.from({ length: count }, () => createUserActionFindSO(createUserActionSO()))
        );

      unsecuredSavedObjectsClient.createPointInTimeFinder.mockReturnValue({
        close: jest.fn(),
        // @ts-expect-error
        find: function* asyncGenerator() {
          yield batch(3);
          yield batch(3);
        },
      });

      const res = await finder.findAll({ caseId: '1' });

      expect(res).toHaveLength(6);
    });

    it('applies types filter in findAll', async () => {
      const userAction = createUserActionSO();
      const soFindRes = createSOFindResponse([createUserActionFindSO(userAction)]);
      mockFinder(soFindRes);

      await finder.findAll({ caseId: '1', types: ['status'] });

      expect(unsecuredSavedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            type: 'function',
            function: 'is',
            arguments: expect.arrayContaining([
              expect.objectContaining({
                value: 'cases-user-actions.attributes.type',
              }),
              expect.objectContaining({
                value: 'status',
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('findStatusChanges', () => {
    it('sets the comment_id to null if it is omitted', async () => {
      const userAction = createUserActionSO();
      const attributes = omit({ ...userAction.attributes }, 'comment_id');
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      mockFinder(soFindRes);

      const res = await finder.findStatusChanges({ caseId: '1' });
      const commentId = res[0].attributes.comment_id;

      expect(commentId).toBe(null);
    });
  });

  describe('decodeUserActions', () => {
    it('decodes valid attributes', async () => {
      const userAction = createUserActionSO();
      mockFinder(createSOFindResponse([createUserActionFindSO(userAction)]));
      const [undecoded] = await finder.findAll({ caseId: '1', decode: false });

      const [res] = finder.decodeUserActions([undecoded]);

      expect(res.attributes).toEqual(
        expect.objectContaining({ type: 'title', payload: { title: 'a new title' } })
      );
    });

    it('throws when attributes are invalid', async () => {
      const invalidUserAction = createUserActionSO({ type: 'title', payload: {} });
      mockFinder(createSOFindResponse([createUserActionFindSO(invalidUserAction)]));
      const [undecoded] = await finder.findAll({ caseId: '1', decode: false });

      expect(() => finder.decodeUserActions([undecoded])).toThrow();
    });
  });

  describe.each(decodingTests)('Decoding: %s', (soMethodName, method) => {
    it('decodes correctly', async () => {
      const userAction = createUserActionSO();
      const soFindRes = createSOFindResponse([createUserActionFindSO(userAction)]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).resolves.not.toThrow();
    });

    it.each(attributesToValidateIfMissing)('throws if %s is omitted', async (key) => {
      const userAction = createUserActionSO();
      const attributes = omit({ ...userAction.attributes }, key);
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).rejects.toThrow(
        `Invalid value "undefined" supplied to "${key}"`
      );
    });

    it('throws if type is omitted', async () => {
      const userAction = createUserActionSO();
      const attributes = omit({ ...userAction.attributes }, 'type');
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).rejects.toThrow();
    });

    it('throws if missing attributes from the payload', async () => {
      const userAction = createUserActionSO();
      const attributes = omit({ ...userAction.attributes }, 'payload.title');
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).rejects.toThrow(
        'Invalid value "undefined" supplied to "payload,title"'
      );
    });

    it('throws if missing nested attributes from the payload', async () => {
      const userAction = createConnectorUserAction();
      const attributes = omit({ ...userAction.attributes }, 'payload.connector.fields.issueType');
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).rejects.toThrow(
        'Invalid value "undefined" supplied to "payload,connector,fields,issueType",Invalid value "{"priority":"high","parent":"2"}" supplied to "payload,connector,fields"'
      );
    });

    it('strips out excess attributes', async () => {
      const userAction = createUserActionSO();
      const attributes = { ...userAction.attributes, 'not-exists': 'not-exists' };
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).resolves.toMatchSnapshot();
    });
  });
});

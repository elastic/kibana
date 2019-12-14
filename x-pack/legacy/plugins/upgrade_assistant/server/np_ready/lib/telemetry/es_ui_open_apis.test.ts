/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UPGRADE_ASSISTANT_DOC_ID, UPGRADE_ASSISTANT_TYPE } from '../../../../common/types';
import { upsertUIOpenOption } from './es_ui_open_apis';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the lib/telemetry tests.
 */
describe('Upgrade Assistant Telemetry SavedObject UIOpen', () => {
  const mockIncrementCounter = jest.fn();
  const server = jest.fn().mockReturnValue({
    savedObjects: {
      getSavedObjectsRepository: jest.fn().mockImplementation(() => {
        return {
          incrementCounter: mockIncrementCounter,
        };
      }),
    },
    plugins: {
      elasticsearch: {
        getCluster: () => {
          return {
            callWithInternalUser: {},
          };
        },
      },
    },
  });

  const request = jest.fn().mockReturnValue({
    payload: {
      overview: true,
      cluster: true,
      indices: true,
    },
  });

  describe('Upsert UIOpen Option', () => {
    it('call saved objects internal repository with the correct info', async () => {
      const serverMock = server();
      const incCounterSORepoFunc = serverMock.savedObjects.getSavedObjectsRepository()
        .incrementCounter;

      await upsertUIOpenOption(serverMock, request());

      expect(incCounterSORepoFunc).toHaveBeenCalledTimes(3);
      expect(incCounterSORepoFunc).toHaveBeenCalledWith(
        UPGRADE_ASSISTANT_TYPE,
        UPGRADE_ASSISTANT_DOC_ID,
        `ui_open.overview`
      );
      expect(incCounterSORepoFunc).toHaveBeenCalledWith(
        UPGRADE_ASSISTANT_TYPE,
        UPGRADE_ASSISTANT_DOC_ID,
        `ui_open.cluster`
      );
      expect(incCounterSORepoFunc).toHaveBeenCalledWith(
        UPGRADE_ASSISTANT_TYPE,
        UPGRADE_ASSISTANT_DOC_ID,
        `ui_open.indices`
      );
    });
  });
});

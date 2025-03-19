/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type MockedLogger, loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import type { Settings } from '../../types';
import { appContextService } from '../app_context';
import { getSettingsOrUndefined, saveSettings } from '../settings';

import { enableSpaceAwarenessMigration } from './enable_space_awareness';

jest.mock('../app_context');
jest.mock('../settings');

function mockGetSettingsOrUndefined(settings?: Partial<Settings>) {
  if (settings) {
    jest.mocked(getSettingsOrUndefined).mockResolvedValue(settings as any);
  } else {
    jest.mocked(getSettingsOrUndefined).mockResolvedValue(undefined);
  }
}

describe('enableSpaceAwarenessMigration', () => {
  let mockedLogger: MockedLogger;
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    soClient = savedObjectsClientMock.create();
    jest.mocked(appContextService.getExperimentalFeatures).mockReset();
    jest.mocked(appContextService.getLogger).mockReturnValue(mockedLogger);
    jest
      .mocked(appContextService.getInternalUserSOClientWithoutSpaceExtension)
      .mockReturnValue(soClient);
    jest.mocked(getSettingsOrUndefined).mockReset();
    jest.mocked(saveSettings).mockReset();

    jest.mocked(saveSettings).mockResolvedValue({} as any);
  });
  it('should do nothing if migration is already done', async () => {
    mockGetSettingsOrUndefined({
      use_space_awareness_migration_status: 'success',
    });
    await enableSpaceAwarenessMigration();
    const logs = loggerMock.collect(mockedLogger);
    expect(logs).toMatchInlineSnapshot(`
      Object {
        "debug": Array [],
        "error": Array [],
        "fatal": Array [],
        "info": Array [],
        "log": Array [],
        "trace": Array [],
        "warn": Array [],
      }
    `);
  });

  it('should do migration if migration is not pending', async () => {
    mockGetSettingsOrUndefined({});

    soClient.createPointInTimeFinder.mockReturnValueOnce({
      find: jest.fn().mockImplementation(async function* () {
        yield {
          saved_objects: [
            { id: 'agent-policy-1', attributes: {} },
            { id: 'agent-policy-2', attributes: {} },
          ],
        };
      }),
      close: jest.fn(),
    });

    soClient.createPointInTimeFinder.mockReturnValueOnce({
      find: jest.fn().mockImplementation(async function* () {
        yield {
          saved_objects: [
            { id: 'package-policy-1', attributes: {} },
            { id: 'package-policy-2', attributes: {} },
          ],
        };
      }),
      close: jest.fn(),
    });

    soClient.bulkCreate.mockImplementation((objects) => {
      return {
        saved_objects: objects.map(() => ({})),
      } as any;
    });

    await enableSpaceAwarenessMigration();

    const logs = loggerMock.collect(mockedLogger);
    expect(logs).toMatchInlineSnapshot(`
      Object {
        "debug": Array [],
        "error": Array [],
        "fatal": Array [],
        "info": Array [
          Array [
            "Starting Fleet space awareness migration",
          ],
          Array [
            "Fleet space awareness migration is complete",
          ],
        ],
        "log": Array [],
        "trace": Array [],
        "warn": Array [],
      }
    `);

    expect(soClient.bulkCreate).toBeCalledWith(
      [
        expect.objectContaining({
          id: 'agent-policy-1',
          type: 'fleet-agent-policies',
        }),
        expect.objectContaining({
          id: 'agent-policy-2',
          type: 'fleet-agent-policies',
        }),
      ],
      { overwrite: true, refresh: 'wait_for' }
    );
    expect(soClient.bulkCreate).toBeCalledWith(
      [
        expect.objectContaining({
          id: 'package-policy-1',
          type: 'fleet-package-policies',
        }),
        expect.objectContaining({
          id: 'package-policy-2',
          type: 'fleet-package-policies',
        }),
      ],
      { overwrite: true, refresh: 'wait_for' }
    );

    expect(saveSettings).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({
        use_space_awareness_migration_status: 'success',
      })
    );
  });

  it('should set the status to error if an error happen', async () => {
    mockGetSettingsOrUndefined({});

    soClient.createPointInTimeFinder.mockImplementation(() => {
      return {
        async *find() {
          throw new Error('unexpected error test');
        },
        close: jest.fn(),
      } as any;
    });

    let error: Error | undefined;
    await enableSpaceAwarenessMigration().catch((err) => {
      error = err;
    });

    expect(error).toBeDefined();

    const logs = loggerMock.collect(mockedLogger);
    expect(logs).toMatchInlineSnapshot(`
      Object {
        "debug": Array [],
        "error": Array [
          Array [
            "Fleet space awareness migration failed",
            Object {
              "error": [Error: unexpected error test],
            },
          ],
        ],
        "fatal": Array [],
        "info": Array [
          Array [
            "Starting Fleet space awareness migration",
          ],
        ],
        "log": Array [],
        "trace": Array [],
        "warn": Array [],
      }
    `);

    expect(saveSettings).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({
        use_space_awareness_migration_status: 'error',
      })
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateParams } from '@kbn/actions-plugin/server/lib';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { Logger } from '@kbn/core/server';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { getConnectorType, ServerLogConnectorType, ServerLogConnectorTypeExecutorOptions } from '.';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggerMock } from '@kbn/logging-mocks';

const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

let connectorType: ServerLogConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

beforeEach(() => {
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType();
});

describe('connectorType', () => {
  test('returns connector type', () => {
    expect(connectorType.id).toEqual('.server-log');
    expect(connectorType.name).toEqual('Server log');
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    expect(
      validateParams(
        connectorType,
        { message: 'a message', level: 'info' },
        { configurationUtilities }
      )
    ).toEqual({
      message: 'a message',
      level: 'info',
    });
    expect(
      validateParams(
        connectorType,
        {
          message: 'a message',
          level: 'info',
        },
        { configurationUtilities }
      )
    ).toEqual({
      message: 'a message',
      level: 'info',
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateParams(connectorType, { message: 1 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      validateParams(connectorType, { message: 'x', level: 2 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action params: [level]: types that failed validation:
- [level.0]: expected value to equal [trace]
- [level.1]: expected value to equal [debug]
- [level.2]: expected value to equal [info]
- [level.3]: expected value to equal [warn]
- [level.4]: expected value to equal [error]
- [level.5]: expected value to equal [fatal]"
`);

    expect(() => {
      validateParams(connectorType, { message: 'x', level: 'foo' }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action params: [level]: types that failed validation:
- [level.0]: expected value to equal [trace]
- [level.1]: expected value to equal [debug]
- [level.2]: expected value to equal [info]
- [level.3]: expected value to equal [warn]
- [level.4]: expected value to equal [error]
- [level.5]: expected value to equal [fatal]"
`);
  });
});

describe('execute()', () => {
  test('calls the executor with proper params', async () => {
    const actionId = 'some-id';
    const executorOptions: ServerLogConnectorTypeExecutorOptions = {
      actionId,
      services: actionsMock.createServices(),
      params: { message: 'message text here', level: 'info' },
      config: {},
      secrets: {},
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector: new ConnectorUsageCollector({
        logger: mockedLogger,
        connectorId: 'test-connector-id',
      }),
    };
    await connectorType.executor(executorOptions);
    expect(mockedLogger.info).toHaveBeenCalledWith('Server log: message text here');
  });
});

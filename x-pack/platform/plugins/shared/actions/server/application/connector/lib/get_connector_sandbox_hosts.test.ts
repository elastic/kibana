/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ActionType } from '../../../types';
import { getConnectorSandboxHosts } from './get_connector_sandbox_hosts';

describe('getConnectorSandboxHosts', () => {
  const createActionType = (
    getSandboxHosts?: ActionType['getSandboxHosts']
  ): Pick<ActionType, 'id' | 'getSandboxHosts'> => ({ id: '.test', getSandboxHosts });

  it('returns the valid hosts, lowercased, trimmed and deduplicated', () => {
    expect(
      getConnectorSandboxHosts({
        actionType: createActionType(() => [
          ' API.example.com ',
          'api.example.com',
          '[::1]',
          'under_score.example.com',
          '*',
          '',
          '10.0.0.5',
        ]),
        config: {},
      })
    ).toEqual(['api.example.com', '10.0.0.5']);
  });

  it('passes the connector config to the hook', () => {
    const getSandboxHosts = jest.fn().mockReturnValue(['api.example.com']);
    getConnectorSandboxHosts({
      actionType: createActionType(getSandboxHosts),
      config: { url: 'https://api.example.com' },
    });
    expect(getSandboxHosts).toHaveBeenCalledWith({ config: { url: 'https://api.example.com' } });
  });

  it('returns no hosts when the action type has no hook', () => {
    expect(getConnectorSandboxHosts({ actionType: createActionType(), config: {} })).toEqual([]);
  });

  it('ignores entries that are not strings', () => {
    expect(
      getConnectorSandboxHosts({
        actionType: createActionType(() => ['api.example.com', 42 as unknown as string]),
        config: {},
      })
    ).toEqual(['api.example.com']);
  });

  it('logs a hook error and returns no hosts', () => {
    const logger = loggingSystemMock.createLogger();

    expect(
      getConnectorSandboxHosts({
        actionType: createActionType(() => {
          throw new Error('boom');
        }),
        config: {},
        connectorId: 'connector-1',
        logger,
      })
    ).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Unable to resolve sandbox hosts for connector "connector-1" (.test), treating it as having no sandbox hosts: boom'
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  createDeploymentToken,
  STREAMS_SLACK_RELAY_API_KEY_TYPE,
} from './create_deployment_api_key';

describe('createDeploymentToken', () => {
  const logger = loggerMock.create();
  const request = {} as KibanaRequest;
  const grantAsInternalUser = jest.fn();

  const security = {
    authc: { apiKeys: { grantAsInternalUser } },
  } as unknown as SecurityPluginStart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('grants a managed Agent Builder read/write API key and returns the encoded value', async () => {
    grantAsInternalUser.mockResolvedValue({ id: 'key-id', name: 'name', api_key: 'secret' });

    const token = await createDeploymentToken({ security, request, logger });

    expect(grantAsInternalUser).toHaveBeenCalledTimes(1);
    const [passedRequest, params] = grantAsInternalUser.mock.calls[0];
    expect(passedRequest).toBe(request);
    expect(params.metadata).toMatchObject({ managed: true });
    expect(params.kibana_role_descriptors[STREAMS_SLACK_RELAY_API_KEY_TYPE].kibana).toEqual([
      { spaces: ['*'], feature: { agentBuilder: ['all'] } },
    ]);

    expect(token).toBe(Buffer.from('key-id:secret').toString('base64'));
  });

  it('throws when the key cannot be created (security disabled)', async () => {
    grantAsInternalUser.mockResolvedValue(null);

    await expect(createDeploymentToken({ security, request, logger })).rejects.toThrow(
      /security is disabled/
    );
    expect(logger.error).toHaveBeenCalled();
  });
});

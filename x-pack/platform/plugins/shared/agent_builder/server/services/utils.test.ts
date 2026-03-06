/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServerMock,
  securityServiceMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import {
  hasVisibilityAccessOverrideFromRequest,
  getAgentApiAccessFromRequest,
  getUserFromRequest,
} from './utils';
import { apiPrivileges } from '../../common/features';

describe('getUserFromRequest', () => {
  let security: ReturnType<typeof securityServiceMock.createStart>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    security = securityServiceMock.createStart();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns user id and username from a real request when getCurrentUser succeeds', async () => {
    const request = httpServerMock.createKibanaRequest();

    security.authc.getCurrentUser.mockReturnValue({
      username: 'testuser',
      profile_uid: 'profile-123',
    } as any);

    const result = await getUserFromRequest({ request, security, esClient });

    expect(result).toEqual({ id: 'profile-123', username: 'testuser' });
    expect(security.authc.getCurrentUser).toHaveBeenCalledWith(request);
    expect(esClient.security.authenticate).not.toHaveBeenCalled();
  });

  it('falls back to ES authenticate API when getCurrentUser returns null for a real request', async () => {
    const request = httpServerMock.createKibanaRequest();

    security.authc.getCurrentUser.mockReturnValue(null);
    esClient.security.authenticate.mockResolvedValue({
      username: 'api-key-user',
    } as any);

    const result = await getUserFromRequest({ request, security, esClient });

    expect(result).toEqual({ username: 'api-key-user' });
    expect(security.authc.getCurrentUser).toHaveBeenCalledWith(request);
    expect(esClient.security.authenticate).toHaveBeenCalledTimes(1);
  });

  it('skips getCurrentUser and falls back to ES authenticate API for fake requests', async () => {
    const request = httpServerMock.createFakeKibanaRequest({});

    esClient.security.authenticate.mockResolvedValue({
      username: 'task-manager-user',
    } as any);

    const result = await getUserFromRequest({ request, security, esClient });

    expect(result).toEqual({ username: 'task-manager-user' });
    expect(security.authc.getCurrentUser).not.toHaveBeenCalled();
    expect(esClient.security.authenticate).toHaveBeenCalledTimes(1);
  });

  it('does not include id in the result when falling back to ES authenticate', async () => {
    const request = httpServerMock.createFakeKibanaRequest({});

    esClient.security.authenticate.mockResolvedValue({
      username: 'some-user',
    } as any);

    const result = await getUserFromRequest({ request, security, esClient });

    expect(result).not.toHaveProperty('id');
    expect(result.username).toBe('some-user');
  });
});

describe('hasVisibilityAccessOverrideFromRequest', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns true when privilege check authorizes override privilege', async () => {
    esClient.security.hasPrivileges.mockResolvedValue({
      application: {},
      cluster: {},
      has_all_requested: true,
      index: {},
      username: 'testuser',
    });

    const result = await hasVisibilityAccessOverrideFromRequest({ esClient });

    expect(result).toBe(true);
    expect(esClient.security.hasPrivileges).toHaveBeenCalledTimes(1);
  });

  it('returns false when privilege check does not authorize override privilege', async () => {
    esClient.security.hasPrivileges.mockResolvedValue({
      application: {},
      cluster: {},
      has_all_requested: false,
      index: {},
      username: 'testuser',
    });

    const result = await hasVisibilityAccessOverrideFromRequest({ esClient });

    expect(result).toBe(false);
    expect(esClient.security.hasPrivileges).toHaveBeenCalledTimes(1);
  });
});

describe('getAgentApiAccessFromRequest', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('resolves read and manage privileges for the current space', async () => {
    esClient.security.hasPrivileges.mockResolvedValue({
      application: {
        'kibana-.kibana': {
          'space:default': {
            [apiPrivileges.readAgentBuilder]: true,
            [apiPrivileges.manageAgents]: false,
          },
        },
      },
      cluster: {},
      has_all_requested: false,
      index: {},
      username: 'testuser',
    });

    const result = await getAgentApiAccessFromRequest({ esClient, space: 'default' });

    expect(result).toEqual({
      canReadAgents: true,
      canManageAgents: false,
    });
    expect(esClient.security.hasPrivileges).toHaveBeenCalledTimes(1);
    expect(esClient.security.hasPrivileges).toHaveBeenCalledWith({
      application: [
        {
          application: 'kibana-.kibana',
          resources: ['space:default'],
          privileges: [apiPrivileges.readAgentBuilder, apiPrivileges.manageAgents],
        },
      ],
    });
  });
});

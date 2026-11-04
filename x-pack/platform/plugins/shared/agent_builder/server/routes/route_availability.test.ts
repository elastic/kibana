/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { publicApiPath } from '../../common/constants';
import type { RouteDependencies } from './types';
import { registerAgentRoutes } from './agents';
import { registerConversationRoutes } from './conversations';

interface Availability {
  stability?: string;
  since?: string;
}

const captureRouteAvailability = (
  register: (deps: RouteDependencies) => void
): Map<string, Availability | undefined> => {
  const availabilities = new Map<string, Availability | undefined>();
  const capture = (method: string) =>
    jest.fn((config: { path: string; options?: { availability?: Availability } }) => {
      availabilities.set(`${method} ${config.path}`, config.options?.availability);
      const versioned = { addVersion: jest.fn() };
      versioned.addVersion.mockReturnValue(versioned);
      return versioned;
    });
  const router = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    versioned: {
      get: capture('GET'),
      post: capture('POST'),
      put: capture('PUT'),
      patch: capture('PATCH'),
      delete: capture('DELETE'),
    },
  };
  register({
    router,
    getInternalServices: jest.fn(),
    coreSetup: {},
    pluginsSetup: {},
    logger: loggingSystemMock.createLogger(),
  } as unknown as RouteDependencies);
  return availabilities;
};

describe('Agent Builder public route availability', () => {
  describe('access control', () => {
    it('marks the agent access control routes as stable', () => {
      const availabilities = captureRouteAvailability(registerAgentRoutes);

      expect(availabilities.get(`GET ${publicApiPath}/agents/{id}/access_control`)).toEqual({
        stability: 'stable',
        since: '9.5.0',
      });
      expect(availabilities.get(`PUT ${publicApiPath}/agents/{id}/access_control`)).toEqual({
        stability: 'stable',
        since: '9.5.0',
      });
    });

    it('marks the conversation access control route as stable', () => {
      const availabilities = captureRouteAvailability(registerConversationRoutes);

      expect(
        availabilities.get(`PUT ${publicApiPath}/conversations/{conversation_id}/access_control`)
      ).toEqual({ stability: 'stable', since: '9.6.0' });
    });
  });

  describe('conversation events', () => {
    it('marks the add events route as tech preview', () => {
      const availabilities = captureRouteAvailability(registerConversationRoutes);

      expect(
        availabilities.get(`POST ${publicApiPath}/conversations/{conversation_id}/_add_events`)
      ).toEqual({ stability: 'tech_preview', since: '9.6.0' });
    });
  });
});

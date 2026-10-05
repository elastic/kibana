/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { createConversationNotFoundError } from '@kbn/agent-builder-common';
import { INVESTIGATION_ASSIGN_URL } from '../../../common/investigations/constants';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import { WrongTemplateError } from '../../assignments/assignments_service';
import type { AssignmentsService } from '../../assignments/assignments_service';
import type { InvestigationRouteDependencies } from '../types';
import { registerInvestigationRoutes } from './register_routes';

type Handler = (
  context: unknown,
  request: ReturnType<typeof httpServerMock.createKibanaRequest>,
  response: ReturnType<typeof httpServerMock.createResponseFactory>
) => Promise<unknown>;

interface RegisteredRoute {
  config: {
    path: string;
    access?: string;
    security?: { authz?: { requiredPrivileges?: string[] } };
  };
  handler: Handler;
}

const MOCK_INVESTIGATION = {
  id: 'investigation-1',
  template_id: 'investigation',
  title: 'Test Investigation',
};

const registerAndCollect = (assignFn: jest.Mock) => {
  const router = httpServiceMock.createRouter();
  const puts: RegisteredRoute[] = [];

  (router.versioned.put as jest.Mock).mockImplementation((config) => ({
    addVersion: (_version: unknown, handler: Handler) => puts.push({ config, handler }),
  }));

  registerInvestigationRoutes({
    router,
    logger: loggingSystemMock.createLogger(),
    getAssignmentsService: () => ({ assign: assignFn } as unknown as AssignmentsService),
  } as unknown as InvestigationRouteDependencies);

  const byPath = (routes: RegisteredRoute[], path: string) =>
    routes.find(({ config }) => config.path === path)!;

  return { router, puts, byPath };
};

describe('investigation routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('privilege wiring', () => {
    it('gates assign on INVESTIGATIONS_API_PRIVILEGE_MANAGE', () => {
      const { byPath, puts } = registerAndCollect(jest.fn());
      expect(
        byPath(puts, INVESTIGATION_ASSIGN_URL).config.security?.authz?.requiredPrivileges
      ).toEqual([INVESTIGATIONS_API_PRIVILEGE_MANAGE]);
    });

    it('marks the assign route as internal', () => {
      const { byPath, puts } = registerAndCollect(jest.fn());
      expect(byPath(puts, INVESTIGATION_ASSIGN_URL).config.access).toBe('internal');
    });
  });

  describe('assign investigation handler', () => {
    it('calls service.assign and returns 200', async () => {
      const assign = jest.fn().mockResolvedValue(MOCK_INVESTIGATION);
      const { byPath, puts } = registerAndCollect(assign);
      const response = httpServerMock.createResponseFactory();

      await byPath(puts, INVESTIGATION_ASSIGN_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'investigation-1' },
          body: { assignees: ['user-1'] },
        }),
        response
      );

      expect(assign).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledWith({ body: MOCK_INVESTIGATION });
    });

    it('maps WrongTemplateError to 404', async () => {
      const assign = jest.fn().mockRejectedValue(new WrongTemplateError('conv-1', 'investigation'));
      const { byPath, puts } = registerAndCollect(assign);
      const response = httpServerMock.createResponseFactory();

      await byPath(puts, INVESTIGATION_ASSIGN_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'conv-1' },
          body: { assignees: [] },
        }),
        response
      );

      expect(response.notFound).toHaveBeenCalled();
    });

    it('maps a conversationNotFound AgentBuilderError to 404', async () => {
      const assign = jest
        .fn()
        .mockRejectedValue(createConversationNotFoundError({ conversationId: 'investigation-1' }));
      const { byPath, puts } = registerAndCollect(assign);
      const response = httpServerMock.createResponseFactory();

      await byPath(puts, INVESTIGATION_ASSIGN_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'investigation-1' },
          body: { assignees: [] },
        }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('maps an unknown error to 500', async () => {
      const assign = jest.fn().mockRejectedValue(new Error('unexpected'));
      const { byPath, puts } = registerAndCollect(assign);
      const response = httpServerMock.createResponseFactory();

      await byPath(puts, INVESTIGATION_ASSIGN_URL).handler(
        {},
        httpServerMock.createKibanaRequest({
          params: { id: 'investigation-1' },
          body: { assignees: [] },
        }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });
});

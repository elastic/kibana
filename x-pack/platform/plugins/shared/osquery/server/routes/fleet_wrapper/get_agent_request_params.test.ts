/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import type {
  IRouter,
  RouteValidationFunction,
  RouteValidationResultFactory,
} from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getAgentDetailsRoute } from './get_agent_details';
import { getAgentPolicyRoute } from './get_agent_policy';

const createValidationResult = (): jest.Mocked<RouteValidationResultFactory> => ({
  ok: jest.fn().mockImplementation((validatedInput) => validatedInput),
  badRequest: jest.fn().mockImplementation((e) => e),
});

interface ParamsValidationConfig {
  request: { params: RouteValidationFunction<unknown> };
}

const ROUTES_UNDER_TEST = [
  {
    description: 'getAgentDetailsRoute',
    path: '/internal/osquery/fleet_wrapper/agents/{id}',
    register: getAgentDetailsRoute,
  },
  {
    description: 'getAgentPolicyRoute',
    path: '/internal/osquery/fleet_wrapper/agent_policies/{id}',
    register: getAgentPolicyRoute,
  },
] as const;

describe('fleet_wrapper request params validation', () => {
  // `register` is called purely to capture the registered validation function; the routes
  // under test don't touch `osqueryContext` until their handler runs, which these tests never do.
  const getParamsValidation = (
    register: (router: IRouter, osqueryContext: OsqueryAppContext) => void,
    path: string
  ): RouteValidationFunction<unknown> => {
    const httpService = httpServiceMock.createSetupContract();
    const mockRouter = httpService.createRouter();
    register(mockRouter, {} as unknown as OsqueryAppContext);

    const route = mockRouter.versioned.getRoute('get', path);
    const routeVersion = route.versions[API_VERSIONS.internal.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.internal.v1}] not found!`);
    }

    // `config.validate.request` is typed as a union (`false | VersionedRouteValidation | (() =>
    // ...)`) to cover every possible route shape; these routes always register the plain object
    // form with a zod-backed params validator.
    const validateConfig = routeVersion.config.validate as unknown as ParamsValidationConfig;

    return validateConfig.request.params;
  };

  describe.each(ROUTES_UNDER_TEST)('$description', ({ path, register }) => {
    it('accepts an id of exactly 1,024 characters', () => {
      const paramsValidation = getParamsValidation(register, path);
      const validationResult = createValidationResult();
      const id = 'a'.repeat(1024);

      paramsValidation({ id }, validationResult);

      expect(validationResult.ok).toHaveBeenCalledWith({ id });
      expect(validationResult.badRequest).not.toHaveBeenCalled();
    });

    it('rejects an id longer than 1,024 characters', () => {
      const paramsValidation = getParamsValidation(register, path);
      const validationResult = createValidationResult();
      const id = 'a'.repeat(1025);

      paramsValidation({ id }, validationResult);

      expect(validationResult.badRequest).toHaveBeenCalledWith(
        expect.stringContaining('<=1024 characters')
      );
      expect(validationResult.ok).not.toHaveBeenCalled();
    });
  });
});

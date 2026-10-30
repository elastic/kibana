/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RouteValidationResultFactory } from '@kbn/core/server';
import { INTERNAL_CASES_SPACE_SETTINGS_URL } from '../../../../common/constants';
import type { CasesSpaceSettings } from '../../../../common/types/domain/space_settings/v1';
import { DEFAULT_CASE_STATUSES } from '../../../../common/utils/statuses';
import { createCasesClientMock } from '../../../client/mocks';
import type { CasesRequestHandlerContext } from '../../../types';
import { isCaseError } from '../../../common/error';
import { getSpaceSettingsRoute, putSpaceSettingsRoute } from './space_settings';

const settings: CasesSpaceSettings = { statuses: [...DEFAULT_CASE_STATUSES] };

const createContext = () => {
  const casesClient = createCasesClientMock();
  const context = {
    cases: Promise.resolve({ getCasesClient: jest.fn().mockResolvedValue(casesClient) }),
  } as unknown as CasesRequestHandlerContext;
  return { casesClient, context };
};

const handlerArgs = () => ({
  response: httpServerMock.createResponseFactory(),
  logger: loggingSystemMock.createLogger(),
  kibanaVersion: '9.0.0',
  incrementAttachmentTypeCounters: jest.fn(),
});

const validationResult: RouteValidationResultFactory = {
  ok: (value) => ({ value }),
  badRequest: (error) => ({ error: new Error(String(error)) as never }),
};

describe('space settings routes', () => {
  it('registers internal GET and PUT routes at the space settings URL', () => {
    expect(getSpaceSettingsRoute).toMatchObject({
      method: 'get',
      path: INTERNAL_CASES_SPACE_SETTINGS_URL,
      routerOptions: { access: 'internal' },
    });
    expect(putSpaceSettingsRoute).toMatchObject({
      method: 'put',
      path: INTERNAL_CASES_SPACE_SETTINGS_URL,
      routerOptions: { access: 'internal' },
    });
  });

  it('GET returns the space settings', async () => {
    const { casesClient, context } = createContext();
    casesClient.spaceSettings.get.mockResolvedValue(settings);
    const args = handlerArgs();

    await getSpaceSettingsRoute.handler({
      ...args,
      context,
      request: httpServerMock.createKibanaRequest(),
    });

    expect(args.response.ok).toHaveBeenCalledWith({ body: settings });
  });

  it('PUT passes the body to the client and returns the saved settings', async () => {
    const { casesClient, context } = createContext();
    casesClient.spaceSettings.update.mockResolvedValue(settings);
    const args = handlerArgs();

    await putSpaceSettingsRoute.handler({
      ...args,
      context,
      request: httpServerMock.createKibanaRequest({ body: settings }),
    });

    expect(casesClient.spaceSettings.update).toHaveBeenCalledWith(settings);
    expect(args.response.ok).toHaveBeenCalledWith({ body: settings });
  });

  it('PUT keeps the status code of a client error', async () => {
    const { casesClient, context } = createContext();
    casesClient.spaceSettings.update.mockRejectedValue(
      Boom.badRequest('Custom statuses are turned off.')
    );

    const error = await putSpaceSettingsRoute
      .handler({
        ...handlerArgs(),
        context,
        request: httpServerMock.createKibanaRequest({ body: settings }),
      })
      .catch((e) => e);

    expect(isCaseError(error) && error.boomify().output.statusCode).toBe(400);
  });

  describe('PUT body validation', () => {
    const validate = (body: unknown) => {
      const { params } = putSpaceSettingsRoute;
      const bodyValidation = params?.body;
      if (typeof bodyValidation !== 'function') {
        throw new Error('expected a validation function');
      }
      return bodyValidation(body, validationResult);
    };

    it('accepts a valid body', () => {
      expect(validate(settings)).toEqual({ value: settings });
    });

    it('rejects too many statuses', () => {
      const statuses = Array.from({ length: 51 }, (_, index) => ({
        ...DEFAULT_CASE_STATUSES[0],
        key: `status_${index}`,
      }));

      expect(validate({ statuses })).toHaveProperty('error');
    });

    it('rejects a label that is too long', () => {
      expect(
        validate({ statuses: [{ ...DEFAULT_CASE_STATUSES[0], label: 'a'.repeat(51) }] })
      ).toHaveProperty('error');
    });

    it('rejects a key with characters outside the allowed set', () => {
      expect(
        validate({ statuses: [{ ...DEFAULT_CASE_STATUSES[0], key: 'Awaiting customer' }] })
      ).toHaveProperty('error');
    });
  });
});

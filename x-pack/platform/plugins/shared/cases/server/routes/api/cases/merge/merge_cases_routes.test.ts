/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  INTERNAL_MERGE_CASES_PREVIEW_URL,
  INTERNAL_MERGE_CASES_URL,
  MERGE_CASES_API_VERSION,
} from '../../../../../common/constants';
import type {
  MergeCasesPreviewResponse,
  MergeCasesRequest,
  MergeCasesResponse,
} from '../../../../../common/types/api';
import { CaseSeverity } from '../../../../../common/types/domain';
import { createTypedApiError } from '../../../../common/api_errors';
import { CASES_API_ERROR_CODES } from '../../../../../common/constants/error_codes';
import { createCasesClientMock } from '../../../../client/mocks';
import type { CasesRequestHandlerContext } from '../../../../types';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../../constants';
import { registerRoutes } from '../../register_routes';
import type { CaseRoute } from '../../types';
import { mergeCasesRoute } from './merge_cases';
import { mergeCasesPreviewRoute } from './merge_cases_preview';

const mergeRequest: MergeCasesRequest = {
  caseIds: ['case-1', 'case-2'],
  fields: { title: 'Phishing', severity: CaseSeverity.HIGH },
  closeSources: true,
};

const counts = (alerts = 0) => ({ alerts, events: 0, attacks: 0, observables: 0, other: 0 });

const mergeResponse: MergeCasesResponse = {
  destination: { id: 'new-case', title: 'Phishing', incrementalId: null, isNew: true },
  sources: [
    {
      caseId: 'case-1',
      title: 'Phishing',
      incrementalId: 118,
      outcome: 'merged',
      closed: true,
      copied: counts(2),
      existing: counts(),
      leftOut: counts(),
    },
  ],
  failures: [],
};

describe('merge cases routes', () => {
  const casesClient = createCasesClientMock();
  const context = {
    cases: { getCasesClient: jest.fn().mockResolvedValue(casesClient) },
  } as unknown as CasesRequestHandlerContext;

  const register = () => {
    const router = httpServiceMock.createRouter();
    registerRoutes({
      router,
      logger: loggingSystemMock.createLogger(),
      routes: [mergeCasesRoute, mergeCasesPreviewRoute] as CaseRoute[],
      kibanaVersion: '9.4.0',
    });
    return router;
  };

  const callRoute = async (path: string, body: object) => {
    const router = register();
    const { handler } = router.versioned.getRoute('post', path).versions[MERGE_CASES_API_VERSION];
    const response = httpServerMock.createResponseFactory();
    await handler(
      context,
      httpServerMock.createKibanaRequest({ method: 'post', path, body }),
      response
    );
    return response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [INTERNAL_MERGE_CASES_URL, 'Merge cases'],
    [INTERNAL_MERGE_CASES_PREVIEW_URL, 'Preview a case merge'],
  ])('registers %s as a documented, versioned internal POST route', (path, summary) => {
    const router = register();
    const { config, versions } = router.versioned.getRoute('post', path);

    expect(router.post).not.toHaveBeenCalled();
    expect(config).toEqual(
      expect.objectContaining({
        access: 'internal',
        summary,
        description: expect.any(String),
        security: DEFAULT_CASES_ROUTE_SECURITY,
        options: expect.objectContaining({ tags: ['oas-tag:cases'] }),
      })
    );
    expect(Object.keys(versions)).toEqual([MERGE_CASES_API_VERSION]);
  });

  it.each([INTERNAL_MERGE_CASES_URL, INTERNAL_MERGE_CASES_PREVIEW_URL])(
    'validates the body of %s against the merge request schema',
    (path) => {
      const router = register();
      const {
        config: { validate },
      } = router.versioned.getRoute('post', path).versions[MERGE_CASES_API_VERSION];
      const bodyValidation = (validate as { request: { body: Function } }).request.body;
      const validationFactory = {
        ok: (value: unknown) => ({ value }),
        badRequest: (error: unknown) => ({ error }),
      };

      expect(bodyValidation({ caseIds: ['only-one'] }, validationFactory)).toEqual(
        expect.objectContaining({ error: expect.anything() })
      );
      expect(bodyValidation({ caseIds: ['case-1', 'case-2'] }, validationFactory)).toEqual({
        value: { caseIds: ['case-1', 'case-2'] },
      });
    }
  );

  it('merges the cases in the request body and returns the result', async () => {
    casesClient.cases.merge.mockResolvedValue(mergeResponse);

    const response = await callRoute(INTERNAL_MERGE_CASES_URL, mergeRequest);

    expect(casesClient.cases.merge).toHaveBeenCalledWith(mergeRequest);
    expect(response.ok).toHaveBeenCalledWith({ body: mergeResponse });
  });

  it('previews the cases in the request body without merging them', async () => {
    const preview = { canMerge: true } as MergeCasesPreviewResponse;
    casesClient.cases.mergePreview.mockResolvedValue(preview);

    const response = await callRoute(INTERNAL_MERGE_CASES_PREVIEW_URL, {
      caseIds: ['case-1', 'case-2'],
    });

    expect(casesClient.cases.mergePreview).toHaveBeenCalledWith({
      caseIds: ['case-1', 'case-2'],
    });
    expect(casesClient.cases.merge).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({ body: preview });
  });

  it.each([
    [400, Boom.badRequest('Cases from different solutions cannot be merged.')],
    [403, Boom.forbidden('Unauthorized to update case')],
    [404, Boom.notFound('Case case-2 not found')],
  ])('responds with %s when the merge is rejected', async (statusCode, error) => {
    casesClient.cases.merge.mockRejectedValue(error);

    const response = await callRoute(INTERNAL_MERGE_CASES_URL, mergeRequest);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode,
        body: expect.objectContaining({ message: expect.stringContaining(error.message) }),
      })
    );
  });

  it('responds with the conflicts and limits of a blocked merge', async () => {
    const attributes = {
      code: CASES_API_ERROR_CODES.MERGE_BLOCKED,
      conflicts: [{ field: 'title' as const, reason: 'differentValues' as const }],
      limits: [{ kind: 'alerts' as const, max: 1000, total: 1240, overBy: 240 }],
    };
    casesClient.cases.merge.mockRejectedValue(
      createTypedApiError({ statusCode: 400, message: 'blocked', attributes })
    );

    const response = await callRoute(INTERNAL_MERGE_CASES_URL, mergeRequest);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ attributes }),
      })
    );
  });

  it('responds with the status of a rejected preview', async () => {
    casesClient.cases.mergePreview.mockRejectedValue(Boom.notFound('Case case-2 not found'));

    const response = await callRoute(INTERNAL_MERGE_CASES_PREVIEW_URL, {
      caseIds: ['case-1', 'case-2'],
    });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

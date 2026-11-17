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
} from '../../../../../common/constants';
import type {
  MergeCasesPreviewResponse,
  MergeCasesRequest,
  MergeCasesResponse,
} from '../../../../../common/types/api';
import { CaseSeverity } from '../../../../../common/types/domain';
import { createCasesClientMock } from '../../../../client/mocks';
import type { CasesRequestHandlerContext } from '../../../../types';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../../constants';
import { registerRoutes } from '../../register_routes';
import type { CaseRoute } from '../../types';
import { mergeCasesRoute } from './merge_cases';
import { mergeCasesPreviewRoute } from './merge_cases_preview';

const mergeRequest: MergeCasesRequest = {
  caseIds: ['case-1', 'case-2'],
  fields: {
    title: 'Phishing',
    description: 'Combined',
    severity: CaseSeverity.HIGH,
    category: null,
    tags: [],
  },
  closeOriginals: true,
};

const mergeResponse: MergeCasesResponse = {
  destination: { id: 'new-case', title: 'Phishing', incrementalId: 142, isNew: true },
  mergedCaseIds: ['case-1', 'case-2'],
  closedCaseIds: ['case-1', 'case-2'],
  copied: { alerts: 3, events: 0, observables: 1, other: 0 },
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
    const [, handler] = router.post.mock.calls.find(([config]) => config.path === path) ?? [];
    const response = httpServerMock.createResponseFactory();
    await handler?.(
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
  ])('registers %s as a documented internal POST route', (path, summary) => {
    const router = register();
    const [config] =
      router.post.mock.calls.find(([{ path: registered }]) => registered === path) ?? [];

    expect(config?.security).toEqual(DEFAULT_CASES_ROUTE_SECURITY);
    expect(config?.options).toEqual(
      expect.objectContaining({
        access: 'internal',
        summary,
        description: expect.any(String),
        tags: ['oas-tag:cases'],
      })
    );
  });

  it('merges the cases in the request body and returns the result', async () => {
    casesClient.cases.merge.mockResolvedValue(mergeResponse);

    const response = await callRoute(INTERNAL_MERGE_CASES_URL, mergeRequest);

    expect(casesClient.cases.merge).toHaveBeenCalledWith(mergeRequest);
    expect(response.ok).toHaveBeenCalledWith({ body: mergeResponse });
  });

  it('previews the cases in the request body without merging them', async () => {
    const preview = { destinationCaseId: null } as MergeCasesPreviewResponse;
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

  it('responds with the status of a rejected preview', async () => {
    casesClient.cases.mergePreview.mockRejectedValue(Boom.notFound('Case case-2 not found'));

    const response = await callRoute(INTERNAL_MERGE_CASES_PREVIEW_URL, {
      caseIds: ['case-1', 'case-2'],
    });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

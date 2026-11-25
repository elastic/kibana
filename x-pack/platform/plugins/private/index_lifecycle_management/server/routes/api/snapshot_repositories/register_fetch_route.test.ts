/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';

import { License } from '../../../services';
import { handleEsError } from '../../../shared_imports';
import { registerFetchRoute } from './register_fetch_route';

describe('[ILM API] Fetch snapshot repositories', () => {
  let routeHandler: RequestHandler;
  let context: ReturnType<typeof coreMock.createCustomRequestHandlerContext>;

  const callRoute = () =>
    routeHandler(context, httpServerMock.createKibanaRequest(), kibanaResponseFactory);

  const getEsClient = async () => (await context.core).elasticsearch.client.asCurrentUser;

  beforeEach(() => {
    const license = new License();
    jest.spyOn(license, 'isCurrentLicenseAtLeast').mockReturnValue(true);

    const router = httpServiceMock.createRouter();
    registerFetchRoute({
      router,
      license,
      config: { ui: { enabled: true }, filteredNodeAttributes: [], enabled: true },
      lib: { handleEsError },
    });
    routeHandler = router.get.mock.calls[0][1];

    context = coreMock.createCustomRequestHandlerContext({});
  });

  it('returns the names of the snapshot repositories', async () => {
    (await getEsClient()).snapshot.getRepository.mockResolvedValueOnce({
      repoA: {},
      repoB: {},
    } as never);

    const response = await callRoute();

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ repositories: ['repoA', 'repoB'] });
  });

  it('returns an empty list when there are no snapshot repositories', async () => {
    (await getEsClient()).snapshot.getRepository.mockResolvedValueOnce({});

    const response = await callRoute();

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ repositories: [] });
  });

  it('returns an empty list when Elasticsearch responds 404', async () => {
    (await getEsClient()).snapshot.getRepository.mockRejectedValueOnce({
      statusCode: 404,
    });

    const response = await callRoute();

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ repositories: [] });
  });
});

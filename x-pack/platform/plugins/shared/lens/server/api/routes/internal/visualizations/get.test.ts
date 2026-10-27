/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import {
  LENS_ERROR_CODES,
  DatasourceNotFoundError,
  LENS_ERROR_TYPE,
  type LensConfigBuilder,
} from '@kbn/lens-embeddable-utils';

import { registerLensInternalVisualizationsGetAPIRoute } from './get';
import { getLensInternalResponseItem } from './utils';
import { LENS_INTERNAL_VIS_API_PATH } from '../../../../../common/constants';

jest.mock('./utils', () => ({
  getLensInternalResponseItem: jest.fn(),
}));

const getLensInternalResponseItemMock = getLensInternalResponseItem as jest.Mock;

const getRouteHandler = () => {
  const mockRoute = { addVersion: jest.fn() };
  const mockRouter = {
    get: jest.fn().mockReturnValue(mockRoute),
  } as unknown as VersionedRouter<RequestHandlerContext>;

  const mockGet = jest.fn().mockResolvedValue({ result: { item: { id: 'id' }, meta: {} } });
  const mockContentManagement = {
    contentClient: {
      getForRequest: jest
        .fn()
        .mockReturnValue({ for: jest.fn().mockReturnValue({ get: mockGet }) }),
    },
  } as unknown as ContentManagementServerSetup;

  registerLensInternalVisualizationsGetAPIRoute(mockRouter, {
    contentManagement: mockContentManagement,
    builder: {} as unknown as LensConfigBuilder,
    logger: {} as unknown as Logger,
    usageCounter: undefined,
  });

  expect(mockRouter.get).toHaveBeenCalledWith(
    expect.objectContaining({ path: `${LENS_INTERNAL_VIS_API_PATH}/{id}` })
  );

  return mockRoute.addVersion.mock.calls[0][1];
};

describe('Lens internal API - Visualizations Get Route', () => {
  const invoke = async () => {
    const mockRes = httpServerMock.createResponseFactory();
    await getRouteHandler()(
      {} as RequestHandlerContext,
      httpServerMock.createKibanaRequest({ params: { id: 'id' } }),
      mockRes
    );
    return mockRes;
  };

  beforeEach(() => {
    getLensInternalResponseItemMock.mockReset();
  });

  it('returns a 422 with the code of a tagged conversion error', async () => {
    getLensInternalResponseItemMock.mockImplementation(() => {
      throw new DatasourceNotFoundError();
    });

    const res = await invoke();

    expect(res.customError).toHaveBeenCalledWith({
      statusCode: 422,
      body: {
        message: new DatasourceNotFoundError().message,
        attributes: { type: LENS_ERROR_TYPE, code: LENS_ERROR_CODES.DATASOURCE_NOT_FOUND },
      },
    });
  });

  it('returns a 422 with the generic code for an untagged conversion error', async () => {
    getLensInternalResponseItemMock.mockImplementation(() => {
      throw new Error('something else');
    });

    const res = await invoke();

    expect(res.customError).toHaveBeenCalledWith({
      statusCode: 422,
      body: {
        message: 'something else',
        attributes: { type: LENS_ERROR_TYPE, code: LENS_ERROR_CODES.INVALID_CONFIGURATION },
      },
    });
  });
});

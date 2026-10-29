/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { createFieldFormatsSetupMock } from '@kbn/field-formats-plugin/server/mocks';
import type { ILicense } from '@kbn/licensing-types';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

import { registerRoutes } from './routes';
import type { License } from './services';
import { TransformServerPlugin } from './plugin';

jest.mock('./routes', () => ({ registerRoutes: jest.fn() }));

const setupLicense = async (license: ILicense): Promise<License> => {
  const licensing = licensingMock.createSetup();
  licensing.license$ = new BehaviorSubject(license);

  const coreStart = coreMock.createStart();
  coreStart.executionContext.getAsLabels.mockReturnValue({});
  const coreSetup = coreMock.createSetup();
  coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

  const plugin = new TransformServerPlugin(coreMock.createPluginInitializerContext());
  plugin.setup(coreSetup, {
    licensing,
    features: featuresPluginMock.createSetup(),
    fieldFormats: createFieldFormatsSetupMock(),
  });

  const { getLicense } = jest.mocked(registerRoutes).mock.calls[0][0];
  return getLicense();
};

const callGuardedRoute = async (license: License) => {
  const handler = jest.fn();
  const response = httpServerMock.createResponseFactory();
  await license.guardApiRoute(handler)(
    coreMock.createCustomRequestHandlerContext({ core: coreMock.createRequestHandlerContext() }),
    httpServerMock.createKibanaRequest(),
    response
  );
  return { handler, response };
};

describe('TransformServerPlugin license guard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(['basic', 'trial'] as const)(
    'runs route handlers on an active %s license',
    async (type) => {
      const license = await setupLicense(
        licensingMock.createLicense({ license: { type, mode: type } })
      );

      const { handler, response } = await callGuardedRoute(license);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(response.customError).not.toHaveBeenCalled();
    }
  );

  it('rejects route handlers with 403 on an expired license', async () => {
    const license = await setupLicense(
      licensingMock.createLicense({ license: { type: 'basic', mode: 'basic', status: 'expired' } })
    );

    const { handler, response } = await callGuardedRoute(license);

    expect(handler).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});

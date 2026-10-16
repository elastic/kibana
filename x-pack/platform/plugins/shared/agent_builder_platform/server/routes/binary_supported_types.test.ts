/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { binarySupportedTypesPath } from '@kbn/agent-builder-plugin/common/constants';
import type { BinaryConverter, BinaryConverters } from '../attachment_types/binary/converters';
import { registerBinarySupportedTypesRoute } from './binary_supported_types';

describe('registerBinarySupportedTypesRoute', () => {
  const createConverter = (available: boolean): BinaryConverter => ({
    isAvailable: () => available,
    toText: jest.fn(),
  });

  const setup = ({ pdfAvailable }: { pdfAvailable: boolean }) => {
    const binaryConverters: BinaryConverters = {
      'application/pdf': createConverter(pdfAvailable),
    };
    const router = httpServiceMock.createRouter();
    registerBinarySupportedTypesRoute({ router, binaryConverters });
    const [config, handler] = router.get.mock.calls[0];
    return { config, handler };
  };

  const callHandler = async (handler: ReturnType<typeof setup>['handler']) => {
    const response = httpServerMock.createResponseFactory();
    await handler({} as never, httpServerMock.createKibanaRequest(), response);
    return response;
  };

  it('registers an internal route that needs the read privilege', () => {
    const { config } = setup({ pdfAvailable: true });
    expect(config.path).toBe('/internal/agent_builder/attachments/binary/_supported_types');
    expect(config.path).toBe(binarySupportedTypesPath);
    expect(config.options).toEqual({ access: 'internal' });
    expect(config.security).toEqual({
      authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
    });
  });

  it('returns PDF when it is available', async () => {
    const { handler } = setup({ pdfAvailable: true });

    const response = await callHandler(handler);

    expect(response.ok).toHaveBeenCalledWith({ body: { mime_types: ['application/pdf'] } });
  });

  it('returns no mime types when PDF is not available', async () => {
    const { handler } = setup({ pdfAvailable: false });

    const response = await callHandler(handler);

    expect(response.ok).toHaveBeenCalledWith({ body: { mime_types: [] } });
  });
});

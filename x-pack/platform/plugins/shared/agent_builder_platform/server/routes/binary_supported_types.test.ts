/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { documentSupportedTypesPath } from '@kbn/agent-builder-plugin/common/constants';
import type {
  DocumentConverter,
  DocumentConverters,
} from '../attachment_types/binary/converters';
import { registerDocumentSupportedTypesRoute } from './binary_supported_types';

describe('registerDocumentSupportedTypesRoute', () => {
  const createConverter = (available: boolean): DocumentConverter => ({
    isAvailable: () => available,
    toText: jest.fn(),
  });

  const setup = ({ pdfAvailable }: { pdfAvailable: boolean }) => {
    const documentConverters: DocumentConverters = {
      'application/pdf': createConverter(pdfAvailable),
    };
    const router = httpServiceMock.createRouter();
    registerDocumentSupportedTypesRoute({ router, documentConverters });
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
    expect(config.path).toBe('/internal/agent_builder/attachments/document/_supported_types');
    expect(config.path).toBe(documentSupportedTypesPath);
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

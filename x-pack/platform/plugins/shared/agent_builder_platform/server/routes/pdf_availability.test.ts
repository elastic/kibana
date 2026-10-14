/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';

const mockIsPdfExtractionAvailable = jest.fn();
jest.mock('../attachment_types/pdf/extraction_availability', () => ({
  isPdfExtractionAvailable: () => mockIsPdfExtractionAvailable(),
}));

import { pdfAvailabilityPath, registerPdfAvailabilityRoute } from './pdf_availability';

describe('registerPdfAvailabilityRoute', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    registerPdfAvailabilityRoute({ router });
    const [config, handler] = router.get.mock.calls[0];
    return { config, handler };
  };

  const callHandler = async (handler: ReturnType<typeof setup>['handler']) => {
    const response = httpServerMock.createResponseFactory();
    await handler({} as never, httpServerMock.createKibanaRequest(), response);
    return response;
  };

  it('registers an internal route that needs the read privilege', () => {
    const { config } = setup();
    expect(config.path).toBe('/internal/agent_builder/attachments/pdf/_available');
    expect(config.path).toBe(pdfAvailabilityPath);
    expect(config.options).toEqual({ access: 'internal' });
    expect(config.security).toEqual({
      authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
    });
  });

  it.each([true, false])('returns available: %s', async (available) => {
    mockIsPdfExtractionAvailable.mockReturnValue(available);
    const { handler } = setup();

    const response = await callHandler(handler);

    expect(response.ok).toHaveBeenCalledWith({ body: { available } });
  });
});

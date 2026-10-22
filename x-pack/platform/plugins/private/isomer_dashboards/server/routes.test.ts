/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { DASHBOARD_FRAME } from '@kbn/isomer-primitives-dashboard';

import { API_BASE, PAGE_WIDTH } from '../common';
import type { IsomerDashboardsStartDeps } from './types';
import { registerRoutes } from './routes';

const setup = (errors: Array<{ path: string; message: string }> = []) => {
  const handlers = new Map<string, RequestHandler>();
  const router = {
    post: jest.fn(({ path }, handler) => handlers.set(path, handler)),
  } as unknown as IRouter;
  const drawing = {
    runtime: { validate: jest.fn(() => ({ errors })) },
    drawPng: jest.fn(async () => Buffer.from('png')),
    drawPdf: jest.fn(async () => Buffer.from('pdf')),
  };
  const core = {
    getStartServices: async () => [{}, { isomer: { getDrawing: async () => drawing } }],
    http: { resources: { register: jest.fn() } },
  } as unknown as CoreSetup<IsomerDashboardsStartDeps>;
  registerRoutes(router, core);
  const draw = async (body: Record<string, unknown>) => {
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ body });
    await handlers.get(`${API_BASE}/draw`)!({} as never, request, response);
    return response;
  };
  return { drawing, draw };
};

const composition = { type: 'view', body: [{ type: 'dashboard', id: 'd' }] };

describe('the draw route', () => {
  it('refuses a composition the runtime finds invalid, drawing nothing', async () => {
    const { drawing, draw } = setup([{ path: 'body.0', message: 'unknown primitive' }]);
    const response = await draw({ composition, layout: 'grid', format: 'png' });
    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Invalid composition: body.0: unknown primitive' },
    });
    expect(drawing.drawPng).not.toHaveBeenCalled();
  });

  it('draws the kept composition as a PNG and a PDF with the same page options', async () => {
    const { drawing, draw } = setup();
    const hints = { panel: { chartType: 'bar' } };
    await draw({ composition, hints, layout: 'stack', format: 'png' });
    const pdf = await draw({ composition, hints, layout: 'stack', format: 'pdf', title: 'Logs' });

    const [pngComposition, pngOptions] = drawing.drawPng.mock.calls[0] as unknown as [
      unknown,
      Record<string, unknown>
    ];
    const [pdfComposition, pdfOptions] = drawing.drawPdf.mock.calls[0] as unknown as [
      unknown,
      Record<string, unknown>
    ];
    expect(pngComposition).toEqual(composition);
    expect(pdfComposition).toEqual(composition);
    expect(pngOptions).toMatchObject({ width: PAGE_WIDTH.stack, frame: DASHBOARD_FRAME });
    expect(pdfOptions).toMatchObject({
      width: PAGE_WIDTH.stack,
      frame: DASHBOARD_FRAME,
      metadata: { title: 'Logs', creator: 'Kibana (Isomer)' },
    });
    expect(pdf.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'content-type': 'application/pdf' }),
      })
    );
  });
});

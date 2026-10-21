/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { CoreSetup, IRouter, KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import type { DrawOptions } from '@kbn/isomer-plugin/server';
import { convertDashboard, engineHintFromLens, type EsqlResponse } from '@kbn/isomer-lowering';
import { dashboardChartSize } from '@kbn/isomer-primitives-dashboard';
import { CARD_CONTENT_WIDTH, kibanaCardFrame } from '@kbn/isomer-theme';

import { API_BASE, type DashboardLayout, PAGE_WIDTH } from '../common';
import type { IsomerDashboardsStartDeps } from './types';
import { toDashboardComposition } from './to_composition';

const params = schema.object({ id: schema.string({ minLength: 1, maxLength: 1000 }) });
const time = schema.string({ minLength: 1, maxLength: 100 });
const layoutSchema = (defaultValue: DashboardLayout) =>
  schema.oneOf([schema.literal('grid'), schema.literal('stack')], { defaultValue });
const widthSchema = schema.maybe(schema.number({ min: PAGE_WIDTH.min, max: PAGE_WIDTH.max }));

const pdfBody = schema.object({
  timeRange: schema.maybe(schema.object({ from: time, to: time })),
  layout: layoutSchema('grid'),
  width: widthSchema,
});
const viewQuery = schema.object({
  from: schema.maybe(time),
  to: schema.maybe(time),
  layout: layoutSchema('stack'),
  width: widthSchema,
});

interface RenderRequest {
  id: string;
  timeRange?: { from: string; to: string };
  layout: DashboardLayout;
  width?: number;
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]!)
  );

const fileName = (title: string) =>
  `${
    title
      .replace(/[^\w\- ]+/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'dashboard'
  }.pdf`;

const notFound = (error: unknown) =>
  (error as { output?: { statusCode?: number } })?.output?.statusCode === 404 ||
  /not found|not exist/i.test(String((error as Error)?.message));

/** Registers the demo's routes: a dashboard as a PDF, and as an HTML view. */
export const registerRoutes = (
  router: IRouter,
  { getStartServices, http }: CoreSetup<IsomerDashboardsStartDeps>
) => {
  const prepare = async (
    context: RequestHandlerContext,
    request: KibanaRequest,
    { id, timeRange, layout, width }: RenderRequest
  ) => {
    const [, { isomer }] = await getStartServices();
    const drawing = await isomer.getDrawing();
    const core = await context.core;
    const exporter = core.savedObjects.getExporter(core.savedObjects.client);
    const stream = await exporter.exportByObjects({
      request,
      objects: [{ type: 'dashboard', id }],
      includeReferencesDeep: true,
      excludeExportDetails: true,
    });
    const lines: string[] = [];
    for await (const object of stream) {
      lines.push(JSON.stringify(object));
    }
    const es = core.elasticsearch.client.asCurrentUser;
    const converted = await convertDashboard({
      ndjson: lines.join('\n'),
      dashboardId: id,
      ...(timeRange ? { timeRange } : {}),
      executeEsql: async (query) => {
        const { columns, values } = await es.esql.query({ query });
        return { columns, values } as unknown as EsqlResponse;
      },
      search: (index, body) => es.search({ index, ...body }),
    });
    const href = `${request.url.origin}${http.basePath.get(
      request
    )}/app/dashboards#/view/${encodeURIComponent(id)}`;
    const { composition, hints } = toDashboardComposition(converted, {
      layout,
      href,
      valid: (node) => {
        const [error] = drawing.runtime.validate({ type: 'view', body: [node] } as never).errors;
        return error ? `${error.path}: ${error.message}` : undefined;
      },
    });
    const page = width ?? PAGE_WIDTH[layout];
    const options: DrawOptions = {
      width: page,
      sizeFor: dashboardChartSize(
        page - (kibanaCardFrame.defaultWidth - CARD_CONTENT_WIDTH)
      ) as DrawOptions['sizeFor'],
      hintFor: (node) => {
        const hint = node.id === undefined ? undefined : hints[node.id];
        return hint
          ? (engineHintFromLens(hint, node as never) as Record<string, unknown>)
          : undefined;
      },
    };
    return { drawing, converted, composition, options };
  };

  router.post(
    {
      path: `${API_BASE}/{id}/pdf`,
      security: {
        authz: {
          enabled: false,
          reason:
            'Reads the dashboard and runs its queries only through the requesting user’s scoped clients.',
        },
      },
      options: { access: 'internal' },
      validate: { params, body: pdfBody },
    },
    async (context, request, response) => {
      const { id } = request.params;
      const { timeRange, layout, width } = request.body as TypeOf<typeof pdfBody>;
      try {
        const { drawing, converted, composition, options } = await prepare(context, request, {
          id,
          ...(timeRange ? { timeRange } : {}),
          layout,
          ...(width ? { width } : {}),
        });
        const pdf = await drawing.drawPdf(composition as never, {
          ...options,
          metadata: { title: converted.title, creator: 'Kibana (Isomer)' },
        });
        return response.ok({
          body: pdf,
          headers: {
            'content-type': 'application/pdf',
            'content-disposition': `attachment; filename="${fileName(converted.title)}"`,
          },
        });
      } catch (error) {
        return notFound(error)
          ? response.notFound({ body: { message: `Dashboard ${id} not found` } })
          : response.customError({
              statusCode: 500,
              body: { message: String((error as Error)?.message ?? error) },
            });
      }
    }
  );

  router.get(
    {
      path: `${API_BASE}/{id}/view`,
      security: {
        authz: {
          enabled: false,
          reason:
            'Reads the dashboard and runs its queries only through the requesting user’s scoped clients.',
        },
      },
      options: { access: 'internal' },
      validate: { params, query: viewQuery },
    },
    async (context, request, response) => {
      const { id } = request.params;
      const { from, to, layout, width } = request.query as TypeOf<typeof viewQuery>;
      try {
        const { drawing, converted, composition, options } = await prepare(context, request, {
          id,
          ...(from && to ? { timeRange: { from, to } } : {}),
          layout,
          ...(width ? { width } : {}),
        });
        const html = await drawing.drawHtml(composition as never, options);
        return response.ok({
          body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(
            converted.title
          )}</title></head><body style="margin:0;padding:16px;background:#fff">${html}</body></html>`,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      } catch (error) {
        return notFound(error)
          ? response.notFound({ body: { message: `Dashboard ${id} not found` } })
          : response.customError({
              statusCode: 500,
              body: { message: String((error as Error)?.message ?? error) },
            });
      }
    }
  );
};

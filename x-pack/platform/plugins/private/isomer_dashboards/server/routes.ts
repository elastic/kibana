/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { CoreSetup, IRouter, KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import type { DrawOptions } from '@kbn/isomer-plugin/server';
import {
  convertDashboard,
  engineHintFromLens,
  type EsqlResponse,
  type PinnedControl,
} from '@kbn/isomer-lowering';
import {
  DASHBOARD_FRAME,
  DASHBOARD_PAGE_PADDING,
  dashboardChartSize,
  panelBodySize,
} from '@kbn/isomer-primitives-dashboard';
import { borealisLight } from '@kbn/isomer-theme';

import { API_BASE, type DashboardLayout, PAGE_WIDTH, VIEW_BASE } from '../common';
import type { IsomerDashboardsStartDeps } from './types';
import { toDashboardComposition } from './to_composition';

const params = schema.object({ id: schema.string({ minLength: 1, maxLength: 1000 }) });
const time = schema.string({ minLength: 1, maxLength: 100 });
const layoutSchema = (defaultValue: DashboardLayout) =>
  schema.oneOf([schema.literal('grid'), schema.literal('stack')], { defaultValue });
const widthSchema = schema.maybe(schema.number({ min: PAGE_WIDTH.min, max: PAGE_WIDTH.max }));

// The controls on screen, in the dashboard API's as-code shape; the lowering reads only what Kibana's controls do.
const MAX_CONTROLS = 100;
const controlSchema = schema.object(
  {
    id: schema.string({ minLength: 1, maxLength: 200 }),
    type: schema.string({ minLength: 1, maxLength: 100 }),
    // Bounded by the route's body limit; the lowering reads only the keys Kibana's controls define.
    config: schema.recordOf(schema.string({ maxLength: 100 }), schema.any()),
  },
  { unknowns: 'ignore' }
);
const controlsSchema = schema.maybe(schema.arrayOf(controlSchema, { maxSize: MAX_CONTROLS }));

const pdfBody = schema.object({
  timeRange: schema.maybe(schema.object({ from: time, to: time })),
  layout: layoutSchema('grid'),
  width: widthSchema,
  controls: controlsSchema,
});
const viewQuery = schema.object({
  from: schema.maybe(time),
  to: schema.maybe(time),
  layout: layoutSchema('stack'),
  width: widthSchema,
  // The on-screen controls as JSON, since a new tab can only send them in the URL.
  controls: schema.maybe(schema.string({ maxLength: 100_000 })),
});

interface RenderRequest {
  id: string;
  timeRange?: { from: string; to: string };
  layout: DashboardLayout;
  width?: number;
  controls?: PinnedControl[];
}

/** The view's `controls` URL parameter, held to the same schema as the PDF route's body. */
const parseControls = (json: string): PinnedControl[] =>
  controlsSchema.validate(JSON.parse(json)) as PinnedControl[];

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
    { id, timeRange, layout, width, controls }: RenderRequest
  ) => {
    const [, { isomer, dataViews }] = await getStartServices();
    const drawing = await isomer.getDrawing();
    // The page, and the dashboard's grid inside the frame's padding.
    const page = width ?? PAGE_WIDTH[layout];
    const gridWidth = page - 2 * DASHBOARD_PAGE_PADDING;
    const ems = isomer.getEms();
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
    // Controls resolve their data view and field as Kibana's do, through the user's data views service.
    const views = await dataViews.dataViewsServiceFactory(core.savedObjects.client, es, request);
    const { uiSettings } = core;
    const [ignoreFilterIfFieldNotInIndex, allowLeadingWildcards, queryStringOptions, dateFormatTZ] =
      await Promise.all([
        uiSettings.client.get<boolean>('courier:ignoreFilterIfFieldNotInIndex'),
        uiSettings.client.get<boolean>('query:allowLeadingWildcards'),
        uiSettings.client.get<Record<string, unknown>>('query:queryString:options'),
        uiSettings.client.get<string>('dateFormat:tz'),
      ]);
    const converted = await convertDashboard({
      ndjson: lines.join('\n'),
      dashboardId: id,
      ...(timeRange ? { timeRange } : {}),
      ...(controls ? { controls } : {}),
      resolveField: async (dataViewId, fieldName) => {
        const dataView = await views.get(dataViewId).catch(() => undefined);
        const field = dataView?.getFieldByName(fieldName);
        return dataView && field ? { dataView, field } : undefined;
      },
      // Every panel's content is lowered at the box the dashboard draws it in.
      panelSize: (grid, { titled }) =>
        panelBodySize({ grid, titled }, { width: gridWidth, layout }),
      esQueryConfig: {
        ignoreFilterIfFieldNotInIndex,
        allowLeadingWildcards,
        queryStringOptions: queryStringOptions as never,
        ...(dateFormatTZ && dateFormatTZ !== 'Browser' ? { dateFormatTZ } : {}),
      },
      executeEsql: async (query, options) => {
        const { columns, values } = await es.esql.query({
          query,
          ...(options?.filter ? { filter: options.filter } : {}),
          ...(options?.params?.length ? { params: options.params } : {}),
        } as never);
        return { columns, values } as unknown as EsqlResponse;
      },
      search: (index, body) => es.search({ index, ...body }),
      // The drawing is light, so an auto-selected basemap is too.
      ...(ems ? { mapServices: ems } : {}),
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
    const options: DrawOptions = {
      width: page,
      frame: DASHBOARD_FRAME,
      sizeFor: dashboardChartSize(gridWidth) as DrawOptions['sizeFor'],
      hintFor: (node) => {
        const hint = node.id === undefined ? undefined : hints[node.id];
        return hint
          ? (engineHintFromLens(hint, node as never) as Record<string, unknown>)
          : undefined;
      },
    };
    return { drawing, converted, composition, hints, options };
  };

  router.post(
    {
      path: `${API_BASE}/{id}/composition`,
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
      const { timeRange, layout, width, controls } = request.body as TypeOf<typeof pdfBody>;
      try {
        const { converted, composition, hints } = await prepare(context, request, {
          id,
          ...(timeRange ? { timeRange } : {}),
          layout,
          ...(width ? { width } : {}),
          ...(controls ? { controls: controls as PinnedControl[] } : {}),
        });
        // What the PDF draws: the composition, as `render_composition` takes it, and the Lens hints by node id.
        return response.ok({
          body: { composition, hints },
          headers: {
            'content-disposition': `attachment; filename="${fileName(converted.title).replace(
              /\.pdf$/,
              ''
            )}.isomer.json"`,
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
      const { timeRange, layout, width, controls } = request.body as TypeOf<typeof pdfBody>;
      try {
        const { drawing, converted, composition, options } = await prepare(context, request, {
          id,
          ...(timeRange ? { timeRange } : {}),
          layout,
          ...(width ? { width } : {}),
          ...(controls ? { controls: controls as PinnedControl[] } : {}),
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

  // A page a browser opens in a tab: it can't send `x-elastic-internal-origin`, so it isn't an internal route.
  http.resources.register(
    {
      path: `${VIEW_BASE}/{id}/view`,
      security: {
        authz: {
          enabled: false,
          reason:
            'Reads the dashboard and runs its queries only through the requesting user’s scoped clients.',
        },
      },
      validate: { params, query: viewQuery },
    },
    async (context, request, response) => {
      const { id } = request.params;
      const { from, to, layout, width, controls } = request.query as TypeOf<typeof viewQuery>;
      try {
        const { drawing, converted, composition, options } = await prepare(context, request, {
          id,
          ...(from && to ? { timeRange: { from, to } } : {}),
          layout,
          ...(width ? { width } : {}),
          ...(controls ? { controls: parseControls(controls) } : {}),
        });
        const html = await drawing.drawHtml(composition as never, options);
        return response.renderHtml({
          body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(
            converted.title
          )}</title></head><body style="margin:0;padding:16px;background:${
            borealisLight.color.background.recessed
          }">${html}</body></html>`,
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

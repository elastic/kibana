/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { KibanaIsomerRuntime } from '@kbn/isomer';
import type { IsomerPluginConfig } from './config';
import { createChartsDrawing, DEFAULT_CHART_SIZE } from './charts_drawing';
import { createRuntime } from './create_runtime';

export type IsomerPluginSetup = Record<string, never>;

export interface IsomerPluginStart {
  /**
   * Resolves the runtime that validates and renders compositions built from Kibana's primitive
   * packs. The first call loads the packs and builds it; later calls share it.
   */
  getRuntime: () => Promise<KibanaIsomerRuntime>;
}

export class IsomerPlugin implements Plugin<IsomerPluginSetup, IsomerPluginStart> {
  private readonly logger: Logger;
  private readonly serverDraw: boolean;
  private runtime?: Promise<KibanaIsomerRuntime>;

  constructor(private readonly initializerContext: PluginInitializerContext<IsomerPluginConfig>) {
    this.logger = initializerContext.logger.get();
    this.serverDraw = initializerContext.config.get().charts.serverDraw;
  }

  setup(core: CoreSetup): IsomerPluginSetup {
    if (this.serverDraw && this.initializerContext.env.mode.dev) {
      this.registerDevRenderRoute(core);
    }
    return {};
  }

  start(): IsomerPluginStart {
    return { getRuntime: this.getRuntime };
  }

  stop() {}

  /** Dev only: draws with per-request hints and chart size, for comparison with Lens. */
  private registerDevRenderRoute(core: CoreSetup) {
    core.http.createRouter().post(
      {
        path: '/internal/isomer/charts/render',
        security: { authz: { enabled: false, reason: 'A dev-only route that reads no data.' } },
        options: { access: 'internal', body: { maxBytes: 20_000_000 } },
        validate: {
          body: schema.object({
            composition: schema.any(),
            surface: schema.oneOf([schema.literal('html'), schema.literal('snapshot')]),
            hints: schema.maybe(schema.any()),
            width: schema.number({ defaultValue: DEFAULT_CHART_SIZE.width }),
            height: schema.number({ defaultValue: DEFAULT_CHART_SIZE.height }),
          }),
        },
      },
      async (_context, request, response) => {
        const { composition, surface, hints, width, height } = request.body;
        // A thread per request, since hints are fixed when the engine is made.
        const drawing = await createChartsDrawing({ hints });
        try {
          const { output, timings } = await drawing.render(composition, surface, { width, height });
          return response.ok({ body: { output, timings, memory: process.memoryUsage() } });
        } finally {
          await drawing.close();
        }
      }
    );
  }

  private readonly getRuntime = (): Promise<KibanaIsomerRuntime> => {
    this.runtime ??= createRuntime().then(
      (runtime) => {
        this.logger.debug('Built the Isomer runtime with the components, Vega, and charts packs.');
        return runtime;
      },
      (error) => {
        this.runtime = undefined;
        throw error;
      }
    );
    return this.runtime;
  };
}

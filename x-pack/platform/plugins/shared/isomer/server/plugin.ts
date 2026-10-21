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
import { existsSync, readFileSync } from 'node:fs';
import { fromRoot } from '@kbn/repo-info';
import {
  type ChartsDrawing,
  createChartsDrawing,
  DEFAULT_CHART_SIZE,
  type IsomerDrawing,
} from './charts_drawing';
import { createRuntime } from './create_runtime';

export type IsomerPluginSetup = Record<string, never>;

export interface IsomerPluginStart {
  /**
   * Resolves the runtime that validates and renders compositions built from Kibana's primitive
   * packs. The first call loads the packs and builds it; later calls share it.
   */
  getRuntime: () => Promise<KibanaIsomerRuntime>;
  /**
   * Resolves server drawing: PNG and PDF from the `snapshot` surface, and `html` with charts drawn.
   * The first call starts the drawing thread. Rejects unless `xpack.isomer.charts.serverDraw` is on.
   */
  getDrawing: () => Promise<IsomerDrawing>;
}

// Demo: the maps pack's only local boundary file, until EMS geometry (F12).
const WORLD_COUNTRIES = fromRoot(
  'x-pack/platform/plugins/shared/maps/test/scout/ui/fixtures/files/world_countries_v7.geo.json'
);

export class IsomerPlugin implements Plugin<IsomerPluginSetup, IsomerPluginStart> {
  private readonly logger: Logger;
  private readonly serverDraw: boolean;
  private runtime?: Promise<KibanaIsomerRuntime>;
  private drawing?: Promise<ChartsDrawing>;

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
    return { getRuntime: this.getRuntime, getDrawing: this.getDrawing };
  }

  async stop() {
    const drawing = this.drawing;
    this.drawing = undefined;
    await drawing?.then(({ close }) => close()).catch(() => undefined);
  }

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

  private readonly getDrawing = (): Promise<IsomerDrawing> => {
    if (!this.serverDraw) {
      return Promise.reject(new Error('Server drawing is off: set xpack.isomer.charts.serverDraw'));
    }
    this.drawing ??= createChartsDrawing(
      existsSync(WORLD_COUNTRIES)
        ? { geometry: { world_countries: JSON.parse(readFileSync(WORLD_COUNTRIES, 'utf8')) } }
        : {}
    ).then(
      (drawing) => {
        this.logger.debug('Started server drawing.');
        return drawing;
      },
      (error) => {
        this.drawing = undefined;
        throw error;
      }
    );
    return this.drawing;
  };

  private readonly getRuntime = (): Promise<KibanaIsomerRuntime> => {
    this.runtime ??= createRuntime().then(
      (runtime) => {
        this.logger.debug('Built the Isomer runtime with the components, Vega, charts, and maps packs.');
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

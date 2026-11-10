/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { MetricNode, Scene, XyChartNode } from '@kbn/isomer';
import { resolveChart } from '@kbn/isomer';
import type { GateAVisualResult, GateCase } from '@kbn/isomer-gate-a';
import {
  createElasticChartsHeadlessEngine,
  kibanaChartSize,
  kibanaTables,
  listGateCases,
  runGateAVisual,
} from '@kbn/isomer-gate-a';
import { createMaterializeKit } from '../kit/create_kit';
import type { KitServices } from '../kit/create_kit';
import { createTestKitServices } from '../kit/kit_services.mock';
import { isUnsupportedNode } from '../nodes';
import { createLensMaterializer } from './materializer';

/**
 * Gate A-visual: Kibana's own captured tables go through the Lens mapping, `resolveChart` and
 * headless Elastic Charts, and both the Scene and the engine's drawing are compared with what Kibana
 * drew (Elastic Charts' `DebugState` for xy, the DOM for metric). Each case's differences are
 * pinned in `gate_a_visual.differences.json`, so a change in either direction fails until the
 * file is updated with `UPDATE_GATE_A=true`.
 */

const DIFFERENCES_FILE = Path.join(__dirname, 'gate_a_visual.differences.json');
const UPDATE = process.env.UPDATE_GATE_A === 'true';

const materializer = createLensMaterializer({
  getTransformOut: () => undefined,
  basePath: { get: () => '' },
});

let services: KitServices;
let engine: Awaited<ReturnType<typeof createElasticChartsHeadlessEngine>>;
beforeAll(async () => {
  services = await createTestKitServices({ 'dateFormat:tz': 'UTC' });
  engine = await createElasticChartsHeadlessEngine();
}, 120_000);

afterAll(async () => {
  await engine?.close();
});

const sceneFor = (gateCase: GateCase): Scene => {
  const { fixture, config, theme } = gateCase;
  const timeZone = String(fixture.context.ui_settings['dateFormat:tz'] ?? 'UTC');
  const kit = createMaterializeKit(services, {
    timeRange: fixture.context.time_range.absolute,
    timeZone,
    locale: 'en',
  });
  const node = materializer.map(
    materializer.parse(config),
    { tables: kibanaTables(gateCase), nodes: [] },
    kit
  );
  if (isUnsupportedNode(node)) {
    throw new Error(`${gateCase.name} did not map: ${node.reason}`);
  }
  return resolveChart(node as MetricNode | XyChartNode, {
    scheme: theme,
    size: kibanaChartSize(gateCase),
    locale: 'en',
    timeZone,
  });
};

describe('Gate A-visual', () => {
  const cases = listGateCases();
  const actual: Record<string, GateAVisualResult> = {};

  afterAll(() => {
    if (UPDATE) {
      Fs.writeFileSync(DIFFERENCES_FILE, `${JSON.stringify(actual, null, 2)}\n`);
    }
  });

  it('covers every ES|QL metric and xy case in the corpus', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases.map((gateCase) => [gateCase.name, gateCase] as const))(
    '%s differs from Kibana only as recorded',
    async (name, gateCase) => {
      actual[name] = await runGateAVisual(gateCase, sceneFor(gateCase), engine);
      if (!UPDATE) {
        const recorded = JSON.parse(Fs.readFileSync(DIFFERENCES_FILE, 'utf8'));
        expect(actual[name]).toEqual(recorded[name]);
      }
    },
    60_000
  );
});

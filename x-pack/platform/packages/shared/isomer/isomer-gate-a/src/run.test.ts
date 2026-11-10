/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import type { Scene } from '@kbn/isomer';
import { resolveChart, xyChartExamples } from '@kbn/isomer';
import type { GateCase } from './corpus';
import { listGateCases } from './corpus';
import type { GateAEngine } from './run';
import { runGateAVisual } from './run';

const gateCase = (name: string): GateCase => {
  const found = listGateCases().find((candidate) => candidate.name === name);
  if (!found) {
    throw new Error(`No gate case ${name}`);
  }
  return found;
};

const bytes = gateCase('sample-logs/cbca842c-b9fa-4523-9ce0-14e350866e33/light');
const visits = gateCase('sample-logs/bb94016e-f4a6-49ca-87a9-296a2869d570/light');
const anyScene = (): Scene => resolveChart(xyChartExamples[0].node, { scheme: 'light' });

/** An engine that draws exactly what Kibana drew, whatever the Scene: a known pass. */
const replay = (source: GateCase): GateAEngine => ({
  draw: async () =>
    source.fixture.chart_type === 'metric'
      ? { kind: 'metric', readings: source.fixture[source.theme].metrics ?? [] }
      : { kind: 'xy', debugState: source.fixture[source.theme].debugState as DebugState },
});

describe('runGateAVisual', () => {
  it("passes an engine that draws what Kibana drew, at Kibana's size", async () => {
    const draw = jest.fn(replay(bytes).draw);
    const { engine } = await runGateAVisual(bytes, anyScene(), { draw });
    expect(engine).toEqual([]);
    expect(draw).toHaveBeenCalledWith(expect.anything(), bytes.fixture.size);
    expect((await runGateAVisual(visits, anyScene(), replay(visits))).engine).toEqual([]);
  });

  it('fails an engine that draws another chart', async () => {
    const { engine } = await runGateAVisual(
      bytes,
      anyScene(),
      replay(gateCase('isomer-corpus-values/values-xy-huge-esql/light'))
    );
    expect(engine?.length).toBeGreaterThan(0);
    expect((await runGateAVisual(visits, anyScene(), replay(bytes))).engine).toEqual([
      'chart kind "metric" vs "xy"',
    ]);
  });

  it('compares the Scene on its own without an engine', async () => {
    const result = await runGateAVisual(bytes, anyScene());
    expect(result.engine).toBeUndefined();
    expect(result.scene.length).toBeGreaterThan(0);
  });
});

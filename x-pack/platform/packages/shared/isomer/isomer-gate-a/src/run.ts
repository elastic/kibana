/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import type { Scene } from '@kbn/isomer';
import type { MetricReading } from './corpus';
import type { CompareOptions, Difference } from './compare';
import { compareCharts } from './compare';
import type { GateCase } from './corpus';
import { kibanaChart, kibanaChartSize } from './corpus';
import { normalizeDebugState } from './debug_state';
import { normalizeMetricReadings } from './metric_dom';
import { normalizeWordReadings } from './records';
import { normalizeScene } from './scene';

/**
 * What an engine reports it drew: Elastic Charts' `DebugState` (xy, partition, heat map, bullet),
 * the metric's readings, a tag cloud's words, or nothing it can compare (`none`).
 */
export type EngineOutput =
  | { kind: 'xy'; debugState: DebugState }
  | { kind: 'metric'; readings: MetricReading[] }
  | { kind: 'words'; texts: Array<{ text: string; fill: string }> }
  | { kind: 'none' };

/** A Scene renderer under test, such as `elastic-charts-node`, drawing at Kibana's size. */
export interface GateAEngine {
  draw(scene: Scene, size: { width: number; height: number }): Promise<EngineOutput>;
}

export interface GateAVisualResult {
  /** The Scene against Kibana: content only. */
  scene: Difference[];
  /** The engine's drawing against Kibana: content, and geometry within the tolerance. */
  engine?: Difference[];
}

/**
 * Gate A-visual for one case: the Scene built from Kibana's own table, and, given an engine, what
 * the engine drew from it, each compared with what Kibana drew.
 */
export const runGateAVisual = async (
  gateCase: GateCase,
  scene: Scene,
  engine?: GateAEngine,
  options?: CompareOptions
): Promise<GateAVisualResult> => {
  const expected = kibanaChart(gateCase);
  const result: GateAVisualResult = { scene: compareCharts(expected, normalizeScene(scene)) };
  if (!engine) {
    return result;
  }
  const output = await engine.draw(scene, kibanaChartSize(gateCase));
  if (output.kind === 'none') {
    return result;
  }
  const drawn =
    output.kind === 'xy'
      ? normalizeDebugState(output.debugState, scene)
      : output.kind === 'words'
      ? normalizeWordReadings(
          output.texts,
          scene.kind === 'tagCloud' && scene.label ? [scene.label] : []
        )
      : normalizeMetricReadings(output.readings);
  return { ...result, engine: compareCharts(expected, drawn, options) };
};

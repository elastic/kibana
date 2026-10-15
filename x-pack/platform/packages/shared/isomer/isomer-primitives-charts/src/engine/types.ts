/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { ChartNode, ChartType } from '../charts/define';
import type { SelectionTarget } from '../model/selection';
import type { ColorMode, ResolvedChartTheme } from '../theme/resolve';

export { CHART_TYPES, type ChartNode, type ChartType } from '../charts/define';

export interface ChartSupport {
  /** `native` draws the chart as specified; `approximate` draws a documented reduction of it. */
  fidelity: 'native' | 'approximate';
  /** For `approximate`: what the drawing drops, in one sentence, for the coverage matrix. */
  reduction?: string;
  /** Whether a click resolves to a target, per mode. */
  selection: { live: boolean; static: boolean; reactNative?: boolean };
  /** The drawing prints the node's `title` itself, so the figure keeps its caption for assistive tech only. */
  drawsTitle?: boolean;
}

export interface LiveChartProps<TNode extends ChartNode = ChartNode> {
  node: TNode;
  theme: ResolvedChartTheme;
  /** Absent on every surface today, since no renderer sees geometry: the chart fills its container. */
  width?: number;
  height?: number;
  /** Raised for a click, with engine-neutral targets; the pack turns it into an `ActionEventRef`. */
  onSelect?: (targets: readonly SelectionTarget[]) => void;
}

export interface DrawRequest {
  mode: ColorMode;
  theme: ResolvedChartTheme;
  width: number;
  height: number;
}

export interface LegendItem {
  label: string;
  color: string;
  target: SelectionTarget;
}

type Shape =
  | { shape: 'rect'; x: number; y: number; width: number; height: number }
  /** Angles in radians clockwise from 12 o'clock. */
  | {
      shape: 'arc';
      cx: number;
      cy: number;
      r0: number;
      r1: number;
      a0: number;
      a1: number;
    }
  | { shape: 'circle'; cx: number; cy: number; r: number }
  | { shape: 'polygon'; points: readonly (readonly [number, number])[] }
  | { shape: 'path'; d: string; hit: 'fill' }
  | { shape: 'path'; d: string; hit: 'stroke'; width: number };

/** A mark in artifact CSS pixels. Only `rect` and `arc` are verified against an engine's own picking. */
export type HitMark = Shape & { target: SelectionTarget };

/** Resolved by the pack's enhancement with no engine code; later marks win. */
export interface HitMap {
  marks: readonly HitMark[];
  /** Columns or rows a click between marks resolves to. */
  bands?: readonly {
    x: number;
    y: number;
    width: number;
    height: number;
    target: SelectionTarget;
  }[];
}

export interface ChartArtifact {
  /** `markup` is a DOM-drawn chart serialized, styled by `stylesheet` with no script. */
  plot:
    | { kind: 'svg'; markup: string }
    | { kind: 'image'; src: string }
    | { kind: 'markup'; html: string; stylesheet: string };
  /** Drawn size in CSS pixels. */
  width: number;
  height: number;
  /** Drawn by the pack as HTML, the same on every engine. Empty when the plot carries its own. */
  legend: readonly LegendItem[];
  /** Absent means the static drawing is noninteractive. */
  hitMap?: HitMap;
}

export type ChartComponents = Partial<{
  [T in ChartType]: ComponentType<LiveChartProps<Extract<ChartNode, { type: T }>>>;
}>;

/** What an engine brings: the pack owns everything else. */
export interface ChartEngine {
  /** Stable id, e.g. `elastic-charts` or `echarts`. */
  id: string;
  /** Part of every artifact key, so an upgrade never serves an old drawing. */
  version: string;
  /** A type absent here renders through the pack's fallback table. */
  supports: Partial<Record<ChartType, ChartSupport>>;
  /** Live mode: mounted in a client-side React tree. */
  live?: ChartComponents;
  /** Static mode: one drawing, ahead of the surface render, through {@link prepareCharts}. */
  draw?: (node: ChartNode, request: DrawRequest) => ChartArtifact | Promise<ChartArtifact>;
  /** React Native, declared rather than inherited. */
  reactNative?: ChartComponents;
}

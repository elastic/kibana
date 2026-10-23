/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';
import type { MapGeometry } from '@kbn/isomer-primitives-maps';

/**
 * How the render process draws a composition. Data only, since it crosses a process boundary: hints are engine
 * hints already converted from Lens, and a dashboard's charts are sized from its grid at `dashboardWidth`.
 */
export interface HostDrawOptions {
  frame?: string;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  /** The size charts draw at when neither the dashboard grid nor the default gives one. */
  chartSize?: { width: number; height: number };
  /** Sizes each chart from its dashboard panel, for a dashboard this many pixels wide inside its padding. */
  dashboardWidth?: number;
  /** Engine hints by chart node id. */
  chartHints?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  scale?: number;
}

export interface InitMessage {
  type: 'init';
  geometry: MapGeometry;
}

export interface DrawMessage {
  type: 'draw';
  id: number;
  composition: Composition;
  options: HostDrawOptions;
}

export type HostMessage = InitMessage | DrawMessage;

export type HostReply =
  | { type: 'ready' }
  | { type: 'failed'; error: string }
  | { type: 'drawn'; id: number; png: Uint8Array }
  | { type: 'error'; id: number; error: string };

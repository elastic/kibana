/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Datatable,
  Filter,
  ExpressionImage,
  ExpressionFunction,
  KibanaContext,
  KibanaDatatable,
  PointSeries,
  Render,
  Style,
  Range,
} from 'src/plugins/expressions';
import { AssetType } from './assets';
import { CanvasWorkpad } from './canvas';

export enum AppStateKeys {
  FULLSCREEN = '__fullscreen',
  REFRESH_INTERVAL = '__refreshInterval',
  AUTOPLAY_INTERVAL = '__autoplayInterval',
}

export interface AppState {
  [AppStateKeys.FULLSCREEN]?: boolean;
  [AppStateKeys.REFRESH_INTERVAL]?: string;
  [AppStateKeys.AUTOPLAY_INTERVAL]?: string;
}

interface StoreAppState {
  basePath: string;
  serverFunctions: ExpressionFunction[];
  ready: boolean;
}

interface ElementStatsType {
  total: number;
  ready: number;
  pending: number;
  error: number;
}

type ExpressionType =
  | Datatable
  | Filter
  | ExpressionImage
  | KibanaContext
  | KibanaDatatable
  | PointSeries
  | Style
  | Range;

interface ExpressionRenderable {
  state: 'ready' | 'pending';
  value: Render<ExpressionType> | null;
  error: null;
}

export interface ExpressionContext {
  state: 'ready' | 'pending';
  value: ExpressionType;
  error: null;
}

export interface ResolvedArgType {
  expressionRenderable?: ExpressionRenderable;
  expressionContext: ExpressionContext;
}

interface TransientState {
  canUserWrite: boolean;
  zoomScale: number;
  elementStats: ElementStatsType;
  fullScreen: boolean;
  selectedTopLevelNodes: string[];
  resolvedArgs: { [key: string]: ResolvedArgType | undefined };
  refresh: {
    interval: number;
  };
  autoplay: {
    enabled: boolean;
    interval: number;
  };
  inFlight: boolean;
}

interface PersistentState {
  schemaVersion: number;
  workpad: CanvasWorkpad;
}

export interface State {
  app: StoreAppState;
  assets: { [assetKey: string]: AssetType | undefined };
  transient: TransientState;
  persistent: PersistentState;
}

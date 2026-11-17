/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebGPURenderer, isWebGPUAvailable } from '@kbn/umap-webgpu';
import { Canvas2DRenderer } from './canvas_2d_renderer';
import { WebGPUPointRenderer } from './webgpu_point_renderer';

export interface PointAppearance {
  /** Visible point radius in CSS pixels. */
  pointSize: number;
  /** Depth fog strength from 0 to 1; only used in 3D. */
  fogStrength: number;
  /** Background color as `#rrggbb`. */
  background: string;
  /** Slowly spin 3D projections. */
  autoRotate: boolean;
  /** Draw group names at their centroids. */
  showLabels: boolean;
}

export interface PointRendererEvents {
  /** A group's label was clicked on the plot. */
  onGroupClick: (group: number) => void;
  /** The user changed the point selection on the plot, for example by clicking empty space. */
  onSelectionChange: () => void;
}

export interface PointRenderer {
  readonly kind: 'webgpu' | 'canvas2d';
  setAppearance(appearance: PointAppearance): void;
  setEventHandlers(handlers: PointRendererEvents): void;
  /** Keeps one group at full strength and fades the rest; `undefined` clears the highlight. */
  setHighlightedGroup(group: number | undefined): void;
  setEmbedding(embedding: number[][], labels: number[], palette: string[]): void;
  /** Names for label indices `0..names.length - 1`; points with higher indices are unlabeled. */
  setLabelNames(names: string[]): void;
  updateEmbedding(embedding: number[][]): void;
  render(): void;
  destroy(): void;
}

/**
 * Creates a WebGPU renderer when available, otherwise a Canvas 2D renderer.
 * A canvas can hold only one context type, so the fallback receives a fresh canvas from `getFallbackCanvas`.
 */
export const createPointRenderer = async (
  canvas: HTMLCanvasElement,
  getFallbackCanvas: () => HTMLCanvasElement,
  appearance: PointAppearance
): Promise<PointRenderer> => {
  if (isWebGPUAvailable()) {
    const renderer = new WebGPURenderer(canvas);
    if (await renderer.init()) return new WebGPUPointRenderer(renderer, appearance);
    renderer.destroy();
  }
  return new Canvas2DRenderer(getFallbackCanvas(), appearance);
};

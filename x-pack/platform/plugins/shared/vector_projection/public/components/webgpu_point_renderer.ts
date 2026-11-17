/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WebGPURenderer } from '@kbn/umap-webgpu';
import type { PointAppearance, PointRenderer, PointRendererEvents } from './point_renderer';

type Rgba = [number, number, number, number];

/** Parses `#rgb` / `#rrggbb` into 0..1 RGBA; falls back to white for other formats. */
const hexToRgba = (hex: string): Rgba => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return [1, 1, 1, 1];
  const digits =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : match[1];
  const channel = (offset: number) => parseInt(digits.slice(offset, offset + 2), 16) / 255;
  return [channel(0), channel(2), channel(4), 1];
};

/** The shader discards the soft outer edge of each point, leaving about 78% of `pointSize` visible. */
const VISIBLE_RADIUS_RATIO = 0.78;

export class WebGPUPointRenderer implements PointRenderer {
  readonly kind = 'webgpu';
  private labels: number[] = [];
  private highlightedGroup: number | undefined;

  constructor(private readonly renderer: WebGPURenderer, private appearance: PointAppearance) {
    this.applyAppearance();
  }

  setAppearance(appearance: PointAppearance) {
    this.appearance = appearance;
    this.applyAppearance();
  }

  setEventHandlers({ onGroupClick, onSelectionChange }: PointRendererEvents) {
    this.renderer.onLabelClick = onGroupClick;
    this.renderer.onSelect = () => onSelectionChange();
  }

  setHighlightedGroup(group: number | undefined) {
    this.highlightedGroup = group;
    this.applyHighlight();
  }

  setEmbedding(embedding: number[][], labels: number[], palette: string[]) {
    this.labels = labels;
    this.renderer.setEmbedding(embedding, labels, palette);
    // setEmbedding resets pointSize, which is measured in device pixels, and may start rotating.
    this.applyAppearance();
    // setEmbedding also clears the selection.
    if (this.highlightedGroup !== undefined) this.applyHighlight();
  }

  setLabelNames(names: string[]) {
    this.renderer.setLabelNames(names);
  }

  updateEmbedding(embedding: number[][]) {
    this.renderer.updateEmbedding(embedding);
  }

  render() {
    this.renderer.render();
  }

  destroy() {
    this.renderer.destroy();
  }

  private applyAppearance() {
    const { pointSize, fogStrength, background, autoRotate, showLabels } = this.appearance;
    this.renderer.pointSize = (pointSize * (window.devicePixelRatio || 1)) / VISIBLE_RADIUS_RATIO;
    this.renderer.fogStrength = fogStrength;
    this.renderer.setBackgroundColor(hexToRgba(background));
    this.renderer.autoRotate = autoRotate;
    this.renderer.updateAutoRotate();
    this.renderer.showLabels = showLabels;
  }

  private applyHighlight() {
    const group = this.highlightedGroup;
    const selected = new Set<number>();
    if (group !== undefined) {
      this.labels.forEach((label, i) => {
        if (label === group) selected.add(i);
      });
    }
    this.renderer.highlightedLabel = group ?? null;
    this.renderer.selectedIndices = selected;
    this.renderer.applySelectionColors();
  }
}

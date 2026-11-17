/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PointAppearance, PointRenderer } from './point_renderer';

/** Opacity of points and labels outside the highlighted group, matching the WebGPU renderer. */
const DIMMED_POINT_ALPHA = 0.15;
const DIMMED_LABEL_ALPHA = 0.25;

/**
 * Fallback renderer for browsers without WebGPU. Draws the first two components only, without fog
 * or rotation. Labels aren't clickable, so groups are highlighted from the legend.
 */
export class Canvas2DRenderer implements PointRenderer {
  readonly kind = 'canvas2d';
  private embedding: number[][] = [];
  private labels: number[] = [];
  private palette: string[] = [];
  private labelNames: string[] = [];
  private highlightedGroup: number | undefined;

  constructor(private readonly canvas: HTMLCanvasElement, private appearance: PointAppearance) {}

  setAppearance(appearance: PointAppearance) {
    this.appearance = appearance;
  }

  setEventHandlers() {}

  setHighlightedGroup(group: number | undefined) {
    this.highlightedGroup = group;
    this.render();
  }

  setEmbedding(embedding: number[][], labels: number[], palette: string[]) {
    this.embedding = embedding;
    this.labels = labels;
    this.palette = palette;
  }

  setLabelNames(names: string[]) {
    this.labelNames = names;
  }

  updateEmbedding(embedding: number[][]) {
    this.embedding = embedding;
  }

  render() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.canvas;
    ctx.fillStyle = this.appearance.background;
    ctx.fillRect(0, 0, width, height);
    if (this.embedding.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of this.embedding) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const ratio = window.devicePixelRatio || 1;
    const padding = 16 * ratio;
    const scale = Math.min(
      (width - 2 * padding) / (maxX - minX || 1),
      (height - 2 * padding) / (maxY - minY || 1)
    );
    const offsetX = (width - (maxX - minX) * scale) / 2;
    const offsetY = (height - (maxY - minY) * scale) / 2;
    const radius = this.appearance.pointSize * ratio;
    const toScreen = (x: number, y: number): [number, number] => [
      offsetX + (x - minX) * scale,
      height - (offsetY + (y - minY) * scale),
    ];

    this.embedding.forEach(([x, y], i) => {
      ctx.fillStyle = this.palette[this.labels[i] % this.palette.length];
      ctx.globalAlpha = this.isDimmed(this.labels[i]) ? DIMMED_POINT_ALPHA : 1;
      ctx.beginPath();
      ctx.arc(...toScreen(x, y), radius, 0, 2 * Math.PI);
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    if (this.appearance.showLabels) this.renderLabels(ctx, ratio, toScreen);
  }

  private isDimmed(group: number): boolean {
    return this.highlightedGroup !== undefined && this.highlightedGroup !== group;
  }

  /** Draws each label at its group's centroid, styled like the WebGPU renderer's overlay. */
  private renderLabels(
    ctx: CanvasRenderingContext2D,
    ratio: number,
    toScreen: (x: number, y: number) => [number, number]
  ) {
    const count = this.labelNames.length;
    if (count === 0) return;
    const sums = Array.from({ length: count }, () => ({ x: 0, y: 0, n: 0 }));
    this.embedding.forEach(([x, y], i) => {
      const sum = sums[this.labels[i]];
      if (!sum) return;
      sum.x += x;
      sum.y += y;
      sum.n++;
    });

    ctx.save();
    ctx.font = `600 ${11 * ratio}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f1f5f9';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4 * ratio;
    sums.forEach(({ x, y, n }, i) => {
      if (n === 0) return;
      ctx.globalAlpha = this.isDimmed(i) ? DIMMED_LABEL_ALPHA : 1;
      ctx.fillText(this.labelNames[i], ...toScreen(x / n, y / n));
    });
    ctx.restore();
  }

  destroy() {
    this.embedding = [];
  }
}

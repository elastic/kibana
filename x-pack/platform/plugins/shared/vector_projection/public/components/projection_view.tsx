/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIconTip,
  EuiProgress,
  euiPaletteColorBlind,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NOISE_COLOR, UMAP, autoCluster } from '@kbn/umap-webgpu';
import {
  CLUSTER_DETAIL_EPSILON_MULTIPLIER,
  DARK_BACKGROUND_COLOR,
  RANDOM_SAMPLE_SEED,
  type BackgroundOption,
  type ClusterDetail,
} from '../../common/constants';
import type { VectorSample } from '../embeddable/vector_sample';
import { createPointRenderer, type PointAppearance, type PointRenderer } from './point_renderer';
import { createSeededRandom } from './seeded_random';

interface Props {
  sample: VectorSample;
  dimensions: 2 | 3;
  nNeighbors: number;
  minDist: number;
  clusterDetail: ClusterDetail;
  pointSize: number;
  fogStrength: number;
  background: BackgroundOption;
  autoRotate: boolean;
  showLabels: boolean;
  onRenderComplete: () => void;
  onError: (error: Error) => void;
}

interface LegendItem {
  /** Label index of the group's points. */
  group: number;
  label: string;
  color: string;
}

/** Minimum time between intermediate frames while UMAP is optimizing. */
const FRAME_INTERVAL_MS = 50;

const PALETTE = euiPaletteColorBlind({ rotations: 2 });

const buildPalette = (count: number, hasOther: boolean): string[] =>
  Array.from({ length: count }, (_, i) =>
    hasOther && i === count - 1 ? NOISE_COLOR : PALETTE[i % PALETTE.length]
  );

const containerCss = css`
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
`;

export const ProjectionView = ({
  sample,
  dimensions,
  nNeighbors,
  minDist,
  clusterDetail,
  pointSize,
  fogStrength,
  background,
  autoRotate,
  showLabels,
  onRenderComplete,
  onError,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PointRenderer>();
  const [isRunning, setIsRunning] = useState(true);
  const [rendererKind, setRendererKind] = useState<PointRenderer['kind']>();
  const [legend, setLegend] = useState<LegendItem[]>([]);
  const [highlightedGroup, setHighlightedGroup] = useState<number>();
  const toggleGroup = useCallback(
    (group: number) => setHighlightedGroup((current) => (current === group ? undefined : group)),
    []
  );
  const backgroundColor =
    background === 'dark' ? DARK_BACKGROUND_COLOR : euiTheme.colors.backgroundBaseSubdued;
  const appearance = useMemo<PointAppearance>(
    () => ({ pointSize, fogStrength, background: backgroundColor, autoRotate, showLabels }),
    [pointSize, fogStrength, backgroundColor, autoRotate, showLabels]
  );
  const appearanceRef = useRef(appearance);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let renderer: PointRenderer | undefined;
    let umap: UMAP | undefined;
    const canvases: HTMLCanvasElement[] = [];

    const createCanvas = () => {
      canvases.forEach((existing) => existing.remove());
      const canvas = document.createElement('canvas');
      canvases.push(canvas);
      container.appendChild(canvas);
      resizeCanvas(canvas);
      return canvas;
    };

    const resizeCanvas = (canvas: HTMLCanvasElement) => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(container.clientWidth * ratio));
      canvas.height = Math.max(1, Math.floor(container.clientHeight * ratio));
    };

    const resizeObserver = new ResizeObserver(() => {
      canvases.forEach(resizeCanvas);
      renderer?.render();
    });
    resizeObserver.observe(container);

    const run = async () => {
      setIsRunning(true);
      const { vectors, categoryIndices, categories, hasOtherCategory = false } = sample;
      const nextRenderer = await createPointRenderer(
        createCanvas(),
        createCanvas,
        appearanceRef.current
      );
      renderer = nextRenderer;
      if (cancelled) return;
      rendererRef.current = nextRenderer;
      setRendererKind(nextRenderer.kind);
      setHighlightedGroup(undefined);
      nextRenderer.setEventHandlers({
        onGroupClick: toggleGroup,
        onSelectionChange: () => setHighlightedGroup(undefined),
      });

      const initialLabels = categoryIndices ?? new Array<number>(vectors.length).fill(0);
      const initialPalette = categories
        ? buildPalette(categories.length, hasOtherCategory)
        : [PALETTE[0]];

      const projector = new UMAP({
        nComponents: dimensions,
        nNeighbors: Math.min(nNeighbors, vectors.length - 1),
        minDist,
        random: createSeededRandom(RANDOM_SAMPLE_SEED),
      });
      umap = projector;

      let hasInitialFrame = false;
      let lastFrame = 0;
      const embedding = await projector.fitAsync(vectors, () => {
        if (cancelled) return false;
        const now = performance.now();
        if (hasInitialFrame && now - lastFrame < FRAME_INTERVAL_MS) return true;
        lastFrame = now;
        if (hasInitialFrame) {
          nextRenderer.updateEmbedding(projector.getEmbedding());
        } else {
          nextRenderer.setEmbedding(projector.getEmbedding(), initialLabels, initialPalette);
          hasInitialFrame = true;
        }
        nextRenderer.render();
        return true;
      });
      if (cancelled) return;

      if (categories && categoryIndices) {
        nextRenderer.setEmbedding(embedding, categoryIndices, initialPalette);
        nextRenderer.setLabelNames(hasOtherCategory ? categories.slice(0, -1) : categories);
        setLegend(categories.map((label, i) => ({ group: i, label, color: initialPalette[i] })));
      } else {
        const { labels, nClusters, noiseCount } = await autoCluster(
          embedding,
          dimensions,
          CLUSTER_DETAIL_EPSILON_MULTIPLIER[clusterDetail]
        );
        if (cancelled) return;
        const palette = buildPalette(nClusters + 1, true);
        const clusterNames = Array.from({ length: nClusters }, (_, i) =>
          i18n.translate('xpack.vectorProjection.legend.cluster', {
            defaultMessage: 'Cluster {index}',
            values: { index: i + 1 },
          })
        );
        nextRenderer.setEmbedding(embedding, labels, palette);
        nextRenderer.setLabelNames(clusterNames);
        setLegend([
          ...clusterNames.map((label, i) => ({ group: i, label, color: palette[i] })),
          ...(noiseCount > 0
            ? [
                {
                  group: nClusters,
                  label: i18n.translate('xpack.vectorProjection.legend.noise', {
                    defaultMessage: 'Unclustered',
                  }),
                  color: NOISE_COLOR,
                },
              ]
            : []),
        ]);
      }
      nextRenderer.render();
      setIsRunning(false);
      onRenderComplete();
    };

    run().catch((error: Error) => {
      if (!cancelled) onError(error);
    });

    return () => {
      cancelled = true;
      rendererRef.current = undefined;
      resizeObserver.disconnect();
      umap?.destroyGPU();
      renderer?.destroy();
      canvases.forEach((canvas) => canvas.remove());
    };
  }, [
    sample,
    dimensions,
    nNeighbors,
    minDist,
    clusterDetail,
    toggleGroup,
    onRenderComplete,
    onError,
  ]);

  useEffect(() => {
    rendererRef.current?.setHighlightedGroup(highlightedGroup);
  }, [highlightedGroup]);

  useEffect(() => {
    appearanceRef.current = appearance;
    rendererRef.current?.setAppearance(appearance);
    rendererRef.current?.render();
  }, [appearance]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={css`
        position: relative;
        height: 100%;
      `}
    >
      {isRunning ? <EuiProgress size="xs" color="accent" position="absolute" /> : null}
      <div
        ref={containerRef}
        css={containerCss}
        data-test-subj="vectorProjectionCanvasContainer"
        aria-label={i18n.translate('xpack.vectorProjection.canvasAriaLabel', {
          defaultMessage: 'UMAP projection of {count} vectors',
          values: { count: sample.vectors.length },
        })}
        role="img"
      />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          wrap
          responsive={false}
          alignItems="center"
          css={css`
            padding: ${euiTheme.size.xs} ${euiTheme.size.s};
          `}
        >
          {legend.map(({ group, label, color }) => (
            <EuiFlexItem
              grow={false}
              key={label}
              css={css`
                opacity: ${highlightedGroup !== undefined && highlightedGroup !== group ? 0.4 : 1};
              `}
            >
              <EuiButtonEmpty
                size="xs"
                color="text"
                flush="both"
                aria-pressed={highlightedGroup === group}
                onClick={() => toggleGroup(group)}
                data-test-subj="vectorProjectionLegendItem"
              >
                <EuiHealth color={color} textSize="xs">
                  {label}
                </EuiHealth>
              </EuiButtonEmpty>
            </EuiFlexItem>
          ))}
          {rendererKind === 'canvas2d' ? (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="info"
                size="s"
                content={i18n.translate('xpack.vectorProjection.cpuFallbackTooltip', {
                  defaultMessage:
                    'WebGPU is not available in this browser, so the projection runs on the CPU and is drawn in 2D.',
                })}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

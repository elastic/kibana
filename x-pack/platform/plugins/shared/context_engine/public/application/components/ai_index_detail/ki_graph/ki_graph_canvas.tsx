/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';
import type { KiGraph } from '../../../utils/ki_graph';
import { KiGraphScene, type KiGraphSceneColors } from './ki_graph_scene';

interface KiGraphCanvasProps {
  graph: KiGraph;
  colors: KiGraphSceneColors;
  hiddenGroups: Set<string>;
  selectedId: string | undefined;
  spin: boolean;
  /** CSS pixels the selection's flyout covers on the right of the stage. */
  focusInset: number;
  /** Share of the canvas width covered on the left by content drawn over it. */
  leftInsetRatio?: number;
  /** Changing it returns the camera to the whole map. */
  resetToken: number;
  onSelect: (id: string | undefined) => void;
}

const canvasCss = css`
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
`;

const canvasLabel = i18n.translate('xpack.contextEngine.kiGraph.canvasLabel', {
  defaultMessage:
    'Graph of the Knowledge Indicators in this AI index and the references between them',
});

/** Mounts a {@link KiGraphScene} on a canvas and keeps it in sync with the props. */
export const KiGraphCanvas = ({
  graph,
  colors,
  hiddenGroups,
  selectedId,
  spin,
  focusInset,
  leftInsetRatio = 0,
  resetToken,
  onSelect,
}: KiGraphCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<KiGraphScene>();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    const scene = new KiGraphScene(canvasRef.current, {
      onSelect: (id) => onSelectRef.current(id),
      onHover: () => {},
    });
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      sceneRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setGraph(graph);
  }, [graph]);

  useEffect(() => {
    sceneRef.current?.setColors(colors);
  }, [colors]);

  useEffect(() => {
    sceneRef.current?.setHiddenGroups(hiddenGroups);
  }, [hiddenGroups]);

  useEffect(() => {
    sceneRef.current?.setSelected(selectedId);
  }, [selectedId]);

  useEffect(() => {
    sceneRef.current?.setSpin(spin);
  }, [spin]);

  useEffect(() => {
    sceneRef.current?.setFocusInset(focusInset);
  }, [focusInset]);

  useEffect(() => {
    sceneRef.current?.setLeftInsetRatio(leftInsetRatio);
  }, [leftInsetRatio]);

  useEffect(() => {
    if (resetToken > 0) {
      sceneRef.current?.resetView();
    }
  }, [resetToken]);

  return (
    <canvas
      ref={canvasRef}
      css={canvasCss}
      role="img"
      aria-label={canvasLabel}
      data-test-subj="contextKiGraphCanvas"
    />
  );
};

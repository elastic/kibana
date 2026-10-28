/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import type { SequenceNodeType, SequenceEdgeType } from '@kbn/alerting-v2-rule-form';

export const useCanvasFitView = (nodesLength: number) => {
  const { fitView } = useReactFlow<SequenceNodeType, SequenceEdgeType>();
  const measuredWidth = useStore((s) => s.width);
  const measuredHeight = useStore((s) => s.height);

  const lastFittedRef = useRef<{ count: number; width: number; height: number }>({
    count: -1,
    width: 0,
    height: 0,
  });
  const fitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (fitTimerRef.current !== undefined) clearTimeout(fitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (nodesLength === 0 || measuredWidth <= 0 || measuredHeight <= 0) return;

    const prev = lastFittedRef.current;
    if (
      prev.count === nodesLength &&
      prev.width === measuredWidth &&
      prev.height === measuredHeight
    )
      return;

    const isInitialFit = prev.count === -1;

    if (fitTimerRef.current !== undefined) clearTimeout(fitTimerRef.current);

    fitTimerRef.current = setTimeout(() => {
      fitTimerRef.current = undefined;
      fitView({ padding: 0.4, duration: isInitialFit ? 0 : 200, maxZoom: 1.2 });
      lastFittedRef.current = { count: nodesLength, width: measuredWidth, height: measuredHeight };
    }, 50);
  }, [measuredWidth, measuredHeight, nodesLength, fitView]);
};

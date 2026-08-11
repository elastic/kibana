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

  const lastFittedCountRef = useRef(-1);
  const fitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    lastFittedCountRef.current = -1;
    return () => {
      if (fitTimerRef.current !== undefined) clearTimeout(fitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (nodesLength === 0 || measuredWidth <= 0 || measuredHeight <= 0) return;
    if (lastFittedCountRef.current === nodesLength) return;

    const isInitialFit = lastFittedCountRef.current === -1;
    const targetCount = nodesLength;

    if (fitTimerRef.current !== undefined) clearTimeout(fitTimerRef.current);

    fitTimerRef.current = setTimeout(() => {
      fitTimerRef.current = undefined;
      fitView({ padding: 0.4, duration: isInitialFit ? 0 : 200, maxZoom: 1.2 });
      lastFittedCountRef.current = targetCount;
    }, 50);
  }, [measuredWidth, measuredHeight, nodesLength, fitView]);
};

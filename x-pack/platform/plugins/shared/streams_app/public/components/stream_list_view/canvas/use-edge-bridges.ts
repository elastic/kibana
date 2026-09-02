/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Owns the edge "bridge" (line-hop) pipeline. Each PipelineRoutingEdge publishes
// its exact render-coordinate segments into a registry via the returned
// `segmentRegistry` (wire it through EdgeSegmentsContext); this hook recomputes
// the crossing hops from those segments and returns them as `edgeHops` (wire
// through EdgeHopsContext). Recompute is debounced to one rAF so a burst of
// publishes during a drag collapses into a single pass.

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  computeHopsFromSegments,
  segmentsEqual,
  type EdgeHops,
  type EdgeSegments,
} from './edges/edge-bridges';
import type { EdgeSegmentRegistry } from './contexts';

export function useEdgeBridges(): { edgeHops: EdgeHops; segmentRegistry: EdgeSegmentRegistry } {
  const segRef = useRef(new Map<string, EdgeSegments>());
  const [version, setVersion] = useState(0);
  const bumpHandle = useRef<number | null>(null);

  // Coalesce many publish()/remove() calls within a frame into one recompute.
  const scheduleBump = useCallback(() => {
    if (bumpHandle.current != null) return;
    bumpHandle.current = requestAnimationFrame(() => {
      bumpHandle.current = null;
      setVersion((v) => v + 1);
    });
  }, []);

  const segmentRegistry = useMemo<EdgeSegmentRegistry>(
    () => ({
      publish: (edgeId, seg) => {
        const prev = segRef.current.get(edgeId);
        if (!prev || !segmentsEqual(prev, seg)) {
          segRef.current.set(edgeId, seg);
          scheduleBump();
        }
      },
      remove: (edgeId) => {
        if (segRef.current.delete(edgeId)) scheduleBump();
      },
    }),
    [scheduleBump]
  );

  // `version` is the dependency on purpose: the segments live in a mutable ref
  // (segRef), so bumping `version` is what signals that the ref's contents
  // changed and the hops must be recomputed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const edgeHops = useMemo(() => computeHopsFromSegments(segRef.current), [version]);

  return { edgeHops, segmentRegistry };
}

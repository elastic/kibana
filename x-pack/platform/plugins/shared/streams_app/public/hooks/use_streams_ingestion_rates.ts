/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useRef, useEffect } from 'react';
import type { StreamDocsStat } from '@kbn/streams-plugin/common';

interface UseStreamsIngestionRatesProps {
  /**
   * Range-scoped per-stream document counts (a single batched request resolved by
   * `useStreamDocCountsFetch`). Resolving one promise for all streams avoids firing one query
   * per stream, which exhausts the browser's connection pool on large stream sets.
   */
  ingestionDocCount: Promise<StreamDocsStat[]>;
  timeStart: number;
  timeEnd: number;
}

interface UseStreamsIngestionRatesResult {
  ingestionByStream: Record<string, number>;
  ingestionLoaded: boolean;
}

/**
 * Resolves the batched per-stream ingested doc counts and computes average docs/sec
 * for the given time range.
 */
export const useStreamsIngestionRates = ({
  ingestionDocCount,
  timeStart,
  timeEnd,
}: UseStreamsIngestionRatesProps): UseStreamsIngestionRatesResult => {
  const [ingestionByStream, setIngestionByStream] = useState<Record<string, number>>({});
  const [ingestionLoaded, setIngestionLoaded] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setIngestionLoaded(false);

    const timeRangeSec = (timeEnd - timeStart) / 1000;

    ingestionDocCount
      .then((counts) => {
        if (cancelledRef.current) return;
        const map: Record<string, number> = {};
        for (const { stream, count } of counts) {
          map[stream] = timeRangeSec > 0 ? count / timeRangeSec : 0;
        }
        setIngestionByStream(map);
        setIngestionLoaded(true);
      })
      .catch(() => {
        if (cancelledRef.current) return;
        setIngestionByStream({});
        setIngestionLoaded(true);
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [ingestionDocCount, timeStart, timeEnd]);

  return { ingestionByStream, ingestionLoaded };
};

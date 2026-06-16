/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useRef, useEffect } from 'react';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';

interface UseStreamsIngestionRatesProps {
  streamNames: string[];
  timeStart: number;
  timeEnd: number;
  getStreamHistogram: (streamName: string) => Promise<UnparsedEsqlResponse>;
}

interface UseStreamsIngestionRatesResult {
  ingestionByStream: Record<string, number>;
  ingestionLoaded: boolean;
}

const sumDocCounts = (result: UnparsedEsqlResponse): number => {
  const colIdx = result.columns?.findIndex((col) => col.name === 'doc_count') ?? -1;
  if (colIdx < 0) return 0;
  return (result.values ?? []).reduce((sum, row) => sum + (Number(row[colIdx]) || 0), 0);
};

/**
 * Resolves per-stream histogram promises and computes average docs/sec
 * for the given time range.
 */
export const useStreamsIngestionRates = ({
  streamNames,
  timeStart,
  timeEnd,
  getStreamHistogram,
}: UseStreamsIngestionRatesProps): UseStreamsIngestionRatesResult => {
  const [ingestionByStream, setIngestionByStream] = useState<Record<string, number>>({});
  const [ingestionLoaded, setIngestionLoaded] = useState(false);
  const cancelledRef = useRef(false);
  const getStreamHistogramRef = useRef(getStreamHistogram);
  getStreamHistogramRef.current = getStreamHistogram;

  useEffect(() => {
    cancelledRef.current = false;
    setIngestionLoaded(false);

    if (streamNames.length === 0) {
      setIngestionByStream({});
      setIngestionLoaded(true);
      return;
    }

    const timeRangeSec = (timeEnd - timeStart) / 1000;

    Promise.all(
      streamNames.map(async (name) => {
        try {
          const totalDocs = sumDocCounts(await getStreamHistogramRef.current(name));
          return { name, rate: timeRangeSec > 0 ? totalDocs / timeRangeSec : 0 };
        } catch {
          return { name, rate: 0 };
        }
      })
    )
      .then((results) => {
        if (cancelledRef.current) return;
        const map: Record<string, number> = {};
        for (const { name, rate } of results) {
          map[name] = rate;
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
  }, [streamNames, timeStart, timeEnd]);

  return { ingestionByStream, ingestionLoaded };
};

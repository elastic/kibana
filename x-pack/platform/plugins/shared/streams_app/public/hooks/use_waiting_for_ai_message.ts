/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEffect, useState } from 'react';

const MESSAGE_BUCKETS: Record<number, string[]> = {
  5: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.5s.1', {
      defaultMessage: 'Processing request...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.5s.2', {
      defaultMessage: 'Formulating an execution plan...',
    }),
  ],
  10: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.10s.1', {
      defaultMessage: 'Generating an optimized Elasticsearch query...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.10s.2', {
      defaultMessage: 'Clustering your data...',
    }),
  ],
  15: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.15s.1', {
      defaultMessage: 'Executing query against your data...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.15s.2', {
      defaultMessage: 'Fetching more data for analysis...',
    }),
  ],
  20: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.20s.1', {
      defaultMessage: 'Analyzing query results...',
    }),
  ],
  25: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.25s.1', {
      defaultMessage: 'Correlating events...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.25s.2', {
      defaultMessage: 'Synthesizing findings...',
    }),
  ],
  30: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.30s.1', {
      defaultMessage: 'Generating a natural language summary...',
    }),
  ],
  35: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.35s.1', {
      defaultMessage: 'Verifying the accuracy of the findings...',
    }),
  ],
  40: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.40s.1', {
      defaultMessage: 'Compiling insights into a final response...',
    }),
  ],
  45: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.45s.1', {
      defaultMessage: 'The analysis is taking longer than usual but is still progressing.',
    }),
  ],
};

export function useWaitingForAiMessage(hasInitialResults: boolean = false) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 5;
        if (next > 60) {
          clearInterval(interval);
          return 60;
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [elapsed]);

  if (elapsed < 5) {
    return hasInitialResults
      ? i18n.translate('xpack.streams.aiFlowWaitingForGeneration.generatingWhileReviewingLabel', {
          defaultMessage: "We'll keep generating while you review the initial results",
        })
      : i18n.translate('xpack.streams.useWaitingForAiMessage.generatingSuggestionsLabel', {
          defaultMessage: 'Generating suggestions...',
        });
  }

  const bucket = Math.min(Math.floor(elapsed / 5) * 5, 45);
  const messages = MESSAGE_BUCKETS[bucket] || [];
  const index = Math.floor(Math.random() * messages.length);

  return (
    messages[index] ||
    i18n.translate('xpack.streams.useWaitingForAiMessage.generatingSuggestionsLabel', {
      defaultMessage: 'Generating suggestions...',
    })
  );
}

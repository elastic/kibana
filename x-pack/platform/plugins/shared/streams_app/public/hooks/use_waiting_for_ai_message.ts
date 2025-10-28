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
      defaultMessage: 'Working on it...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.5s.2', {
      defaultMessage: 'Just a moment...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.5s.3', {
      defaultMessage: "Let's race, me versus your coffee machine!",
    }),
  ],
  10: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.10s.1', {
      defaultMessage: 'This is taking longer than usual...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.10s.2', {
      defaultMessage: 'Still thinking...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.10s.3', {
      defaultMessage: 'Still crunching the numbers...',
    }),
  ],
  15: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.15s.1', {
      defaultMessage: 'Still processing...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.15s.2', {
      defaultMessage: 'Hold on...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.15s.3', {
      defaultMessage: "I'm not giving up yet...",
    }),
  ],
  20: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.20s.1', {
      defaultMessage: 'Hang in there...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.20s.2', {
      defaultMessage: 'Almost done...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.20s.3', {
      defaultMessage: 'Still working on your request...',
    }),
  ],
  25: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.25s.1', {
      defaultMessage: 'Almost there, I think...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.25s.2', {
      defaultMessage: 'Finalizing...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.25s.3', {
      defaultMessage: 'Just checking everything...',
    }),
  ],
  30: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.30s.1', {
      defaultMessage: 'Just the final touches...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.30s.2', {
      defaultMessage: 'Nearly ready...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.30s.3', {
      defaultMessage: 'Last step, promise!',
    }),
  ],
  35: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.35s.1', {
      defaultMessage: 'Still working...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.35s.2', {
      defaultMessage: 'Thanks for your patience...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.35s.3', {
      defaultMessage: "We're nearly there...",
    }),
  ],
  40: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.40s.1', {
      defaultMessage: 'Just a bit longer...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.40s.2', {
      defaultMessage: "We're nearly there...",
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.40s.3', {
      defaultMessage: 'Still processing, please wait...',
    }),
  ],
  45: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.45s.1', {
      defaultMessage: 'Still going...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.45s.2', {
      defaultMessage: 'Thank you for waiting...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.45s.3', {
      defaultMessage: 'Just finishing up...',
    }),
  ],
  50: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.50s.1', {
      defaultMessage: 'Almost complete...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.50s.2', {
      defaultMessage: 'Just finishing up...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.50s.3', {
      defaultMessage: 'Final steps...',
    }),
  ],
  55: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.55s.1', {
      defaultMessage: 'One moment more...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.55s.2', {
      defaultMessage: 'Wrapping up...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.55s.3', {
      defaultMessage: 'Last checks...',
    }),
  ],
  60: [
    i18n.translate('xpack.streams.useWaitingForAiMessage.60s.1', {
      defaultMessage: 'Thanks for waiting! Still working...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.60s.2', {
      defaultMessage: 'Still processing, please wait...',
    }),
    i18n.translate('xpack.streams.useWaitingForAiMessage.60s.3', {
      defaultMessage: 'Nearly finished...',
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

  const bucket = Math.min(Math.floor(elapsed / 5) * 5, 60);
  const messages = MESSAGE_BUCKETS[bucket] || [];
  const index = Math.floor(Math.random() * messages.length);

  return (
    messages[index] ||
    i18n.translate('xpack.streams.useWaitingForAiMessage.generatingSuggestionsLabel', {
      defaultMessage: 'Generating suggestions...',
    })
  );
}

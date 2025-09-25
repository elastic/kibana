/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEffect, useState } from 'react';

export function useWaitingForAiMessage() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 5);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (elapsed >= 30) {
    return i18n.translate(
      'xpack.streams.useWaitingForAiMessage.generatingSuggestions30SecondsWaitedLabel',
      {
        defaultMessage: 'Just the final touches...',
      }
    );
  } else if (elapsed >= 25) {
    return i18n.translate(
      'xpack.streams.useWaitingForAiMessage.generatingSuggestions25SecondsWaitedLabel',
      {
        defaultMessage: 'Almost there, I think...',
      }
    );
  } else if (elapsed >= 20) {
    return i18n.translate(
      'xpack.streams.useWaitingForAiMessage.generatingSuggestions20SecondsWaitedLabel',
      {
        defaultMessage: 'Hang in there...',
      }
    );
  } else if (elapsed >= 15) {
    return i18n.translate(
      'xpack.streams.useWaitingForAiMessage.generatingSuggestions15SecondsWaitedLabel',
      {
        defaultMessage: 'Still processing...',
      }
    );
  } else if (elapsed >= 10) {
    return i18n.translate(
      'xpack.streams.useWaitingForAiMessage.generatingSuggestions10SecondsWaitedLabel',
      {
        defaultMessage: 'This is taking longer than usual...',
      }
    );
  } else if (elapsed >= 5) {
    return i18n.translate(
      'xpack.streams.useWaitingForAiMessage.generatingSuggestions5SecondsWaited',
      {
        defaultMessage: 'Working on it...',
      }
    );
  }

  return i18n.translate('xpack.streams.useWaitingForAiMessage.generatingSuggestionsLabel', {
    defaultMessage: 'Generating suggestions...',
  });
}

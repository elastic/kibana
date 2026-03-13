/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { css } from '@emotion/react';
import { euiScreenReaderOnly } from '@elastic/eui';
import { useSendMessage } from '../../../context/send_message/send_message_context';

// Intervals grow by 5s each announcement, capped at 30s.
// e.g. announcements fire at: 0s, 5s, 15s, 30s, 50s, 75s, 105s, 135s, ...
const INITIAL_INTERVAL_MS = 5_000;
const INTERVAL_INCREMENT_MS = 5_000;
const MAX_INTERVAL_MS = 30_000;

// Each "still generating" announcement includes elapsed seconds so the text always
// changes, ensuring the live region detects a new DOM mutation on every update.
const useGeneratingAnnouncements = (isActive: boolean) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!isActive) {
      return;
    }

    setAnnouncement(
      i18n.translate('xpack.agentBuilder.conversationRounds.generatingAnnouncement', {
        defaultMessage: 'Agent is generating a response.',
      })
    );

    let elapsed = 0;
    let nextDelay = INITIAL_INTERVAL_MS;
    let timeoutId: number;

    const scheduleNext = () => {
      timeoutId = window.setTimeout(() => {
        elapsed += nextDelay;
        setAnnouncement(
          i18n.translate('xpack.agentBuilder.conversationRounds.stillGeneratingAnnouncement', {
            defaultMessage: 'Agent is still generating a response. {elapsed} seconds elapsed.',
            values: { elapsed: Math.round(elapsed / 1000) },
          })
        );
        nextDelay = Math.min(nextDelay + INTERVAL_INCREMENT_MS, MAX_INTERVAL_MS);
        scheduleNext();
      }, nextDelay);
    };

    scheduleNext();

    return () => {
      clearTimeout(timeoutId);
      setAnnouncement('');
    };
  }, [isActive]);

  return announcement;
};

export const RoundsScreenReaderStatus: React.FC<{ lastRound?: ConversationRound }> = ({
  lastRound,
}) => {
  const { isResponseLoading } = useSendMessage();
  const announcement = useGeneratingAnnouncements(isResponseLoading);

  const responseWasLoading = useRef(false);
  const [shouldAnnounceResponse, setShouldAnnounceResponse] = useState(false);

  useEffect(() => {
    if (isResponseLoading) {
      responseWasLoading.current = true;
      setShouldAnnounceResponse(false);
    } else if (responseWasLoading.current) {
      setShouldAnnounceResponse(true);
    }
  }, [isResponseLoading]);

  return (
    <div
      css={css`
        ${euiScreenReaderOnly()}
      `}
    >
      {/* Generating region: content changes on every interval so VoiceOver detects a new mutation */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {/* Response region: transitions from empty to message text when loading completes */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {shouldAnnounceResponse
          ? i18n.translate('xpack.agentBuilder.conversationRounds.agentResponse', {
              defaultMessage: 'Agent said: {message}',
              values: { message: lastRound?.response.message ?? '' },
            })
          : ''}
      </div>
    </div>
  );
};

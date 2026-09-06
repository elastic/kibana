/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineView } from '@kbn/adaptive-ui';
import {
  toSignificantEventAttachmentViewSpec,
  type SignificantEventAttachmentInput,
} from '@kbn/adaptive-ui-adapters';
import { registeredViewIds } from '../../common/constants';

export { toSignificantEventAttachmentViewSpec, type SignificantEventAttachmentInput };

const isLiveEventInput = (input: unknown): input is SignificantEventAttachmentInput => {
  if (input == null || typeof input !== 'object') {
    return false;
  }
  const candidate = input as Partial<SignificantEventAttachmentInput>;
  return (
    typeof candidate.event_id === 'string' &&
    candidate.event_id.length > 0 &&
    typeof candidate.title === 'string' &&
    typeof candidate.summary === 'string' &&
    typeof candidate.status === 'string' &&
    typeof candidate.severity === 'string' &&
    typeof candidate.confidence === 'number'
  );
};

export const significantEventView = defineView({
  id: registeredViewIds.significantEvent,
  title: 'Significant Event',
  description:
    'Renders a live Streams Significant Event as a card. Pass `event_id`; this looks up that event. It does not accept a field overlay and does not fall back to sample data.',
  answers: [
    'Show me the significant event',
    'What is going on with this incident?',
    'Summarize the significant event',
  ],
  build: ({ input }) => {
    if (!isLiveEventInput(input)) {
      throw new Error(
        'streams.significantEvent requires a live significant event payload (event_id, title, summary, status, severity, confidence). Pass event_id to request_registered_view; do not omit input or overlay sample fields.'
      );
    }
    return toSignificantEventAttachmentViewSpec(input);
  },
});

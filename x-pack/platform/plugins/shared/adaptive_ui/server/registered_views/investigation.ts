/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineView } from '@kbn/adaptive-ui';
import { toInvestigationViewSpec, type InvestigationInput } from '@kbn/adaptive-ui-adapters';
import { registeredViewIds } from '../../common/constants';

export { toInvestigationViewSpec, type InvestigationInput };

const isLiveInvestigationInput = (input: unknown): input is InvestigationInput => {
  if (input == null || typeof input !== 'object') {
    return false;
  }
  const candidate = input as Partial<InvestigationInput>;
  return typeof candidate.summary === 'string' && candidate.summary.length > 0;
};

export const investigationView = defineView({
  id: registeredViewIds.investigation,
  title: 'Nightshift Investigation',
  description:
    'Renders a live Nightshift investigation as a card. Pass `investigation_id`, or `event_id` to use that event’s latest attached investigation. It does not fall back to sample data.',
  answers: [
    'Show me the investigation',
    'What did Nightshift conclude?',
    'What are the remediations?',
    'Share the investigation with the on-call channel',
  ],
  build: ({ input }) => {
    if (!isLiveInvestigationInput(input)) {
      throw new Error(
        'nightshift.investigation requires a live investigation payload (summary). Pass investigation_id or event_id to request_registered_view; do not omit input or overlay sample fields.'
      );
    }
    return toInvestigationViewSpec(input);
  },
});

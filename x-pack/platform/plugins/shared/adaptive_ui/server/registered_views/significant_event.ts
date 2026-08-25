/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineView } from '@kbn/adaptive-ui';
import {
  buildSignificantEventSpec,
  significantEventFixture,
  significantEventSpec,
  type SignificantEventInput,
} from '../../common/adapters/sig_event';
import { registeredViewIds } from '../../common/constants';

// The `SignificantEvent` → `ViewSpec` mapping is isomorphic (plain builders), so
// it lives in `common/adapters/sig_event.ts` where both this registered view and
// the `platform.sig_event` attachment adapter share it.
export {
  buildSignificantEventSpec,
  significantEventFixture,
  significantEventSpec,
  type SignificantEventInput,
};

export const significantEventView = defineView({
  id: registeredViewIds.significantEvent,
  title: 'Significant Event',
  description:
    'Renders a Streams Significant Event — root cause, ranked remediations, and supporting evidence — as a card. Use when asked to show or summarize a significant event/incident.',
  answers: [
    'Show me the significant event',
    'What is the root cause of this incident?',
    'Summarize the significant event',
    'What should we do about the dropped payments?',
  ],
  build: ({ input }) => {
    const overrides = (input ?? {}) as Partial<SignificantEventInput>;
    return Object.keys(overrides).length === 0
      ? significantEventSpec
      : buildSignificantEventSpec({ ...significantEventFixture, ...overrides });
  },
});

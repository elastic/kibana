/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineView } from '@kbn/adaptive-ui';
import {
  investigationSpec,
  sampleInvestigation,
  toInvestigationViewSpec,
  type InvestigationInput,
} from '../../common/adapters/investigation';
import { registeredViewIds } from '../../common/constants';

export { investigationSpec, sampleInvestigation, toInvestigationViewSpec, type InvestigationInput };

export const investigationView = defineView({
  id: registeredViewIds.investigation,
  title: 'Nightshift Investigation',
  description:
    'Renders a Nightshift investigation — conclusion, ranked remediations, blind spots, and evidence — as a card. Use when asked to show or share an investigation.',
  answers: [
    'Show me the investigation',
    'What did Nightshift conclude?',
    'What are the remediations?',
    'Share the investigation with the on-call channel',
  ],
  build: ({ input }) => {
    const overrides = (input ?? {}) as Partial<InvestigationInput>;
    return Object.keys(overrides).length === 0
      ? investigationSpec
      : toInvestigationViewSpec({ ...sampleInvestigation, ...overrides });
  },
});

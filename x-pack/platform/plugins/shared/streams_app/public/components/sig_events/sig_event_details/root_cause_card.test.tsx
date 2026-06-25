/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { SigEvent } from '@kbn/streams-schema';
import { RootCauseCard } from './root_cause_card';

type Evidence = NonNullable<SigEvent['evidences']>[number];

const baseEvent: SigEvent = {
  '@timestamp': '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  event_id: 'evt-1',
  discovery_slug: 'payment-outage',
  stream_names: ['logs.payment'],
  title: 'Payment service outage',
  summary: 'Summary',
  root_cause: 'Upstream auth provider returned 503 for 12 minutes.',
  criticality: 80,
  confidence: 78,
  impact: 'high',
  recommendations: [],
  status: 'promoted',
};

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('RootCauseCard', () => {
  describe('visibility', () => {
    it('returns null when there is no root cause, no evidences, and no assessment note', () => {
      const { container } = renderWithI18n(
        <RootCauseCard
          event={{
            ...baseEvent,
            root_cause: '',
            evidences: undefined,
            assessment_note: undefined,
          }}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('renders the card when only an assessment note exists', () => {
      renderWithI18n(
        <RootCauseCard
          event={{
            ...baseEvent,
            root_cause: '',
            assessment_note: 'Judge concurred with discovery.',
          }}
        />
      );

      expect(screen.getByText('Root cause')).toBeInTheDocument();
      expect(screen.getByText('Assessment')).toBeInTheDocument();
    });

    it('renders the card when only evidences exist', () => {
      renderWithI18n(
        <RootCauseCard
          event={{
            ...baseEvent,
            root_cause: '',
            evidences: [{ rule_name: 'auth_5xx_spike' }],
          }}
        />
      );

      expect(screen.getByText('Evidence trail')).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders the "Root cause" label badge', () => {
      renderWithI18n(<RootCauseCard event={baseEvent} />);

      expect(screen.getByText('Root cause')).toBeInTheDocument();
    });

    it('renders the event title and root cause text', () => {
      renderWithI18n(<RootCauseCard event={baseEvent} />);

      expect(screen.getByText('Payment service outage')).toBeInTheDocument();
      expect(
        screen.getByText('Upstream auth provider returned 503 for 12 minutes.')
      ).toBeInTheDocument();
    });

    it('renders the "no working theory" placeholder when root_cause is empty', () => {
      renderWithI18n(
        <RootCauseCard
          event={{
            ...baseEvent,
            root_cause: '',
            evidences: [{ rule_name: 'r' }],
          }}
        />
      );

      expect(
        screen.getByText('No root cause correction was issued for this event.')
      ).toBeInTheDocument();
    });
  });

  describe('confidence badge', () => {
    it('renders "Confidence N%" with the rounded value', () => {
      renderWithI18n(<RootCauseCard event={{ ...baseEvent, confidence: 78.4 }} />);

      expect(screen.getByText('Confidence 78%')).toBeInTheDocument();
    });

    it('normalizes 0–1 confidence values to a 0–100 percentage', () => {
      renderWithI18n(<RootCauseCard event={{ ...baseEvent, confidence: 0.42 }} />);

      expect(screen.getByText('Confidence 42%')).toBeInTheDocument();
    });

    it('does not render the confidence badge when the value is NaN', () => {
      renderWithI18n(<RootCauseCard event={{ ...baseEvent, confidence: NaN }} />);

      expect(screen.queryByText(/Confidence/)).not.toBeInTheDocument();
    });
  });

  describe('Assessment accordion', () => {
    const assessmentNote = 'Judge confirmed primary signal; budget exhausted on entry #3.';

    it('renders the Assessment accordion and its note when assessment_note is set', () => {
      renderWithI18n(
        <RootCauseCard event={{ ...baseEvent, assessment_note: assessmentNote }} />
      );

      expect(screen.getByText('Assessment')).toBeInTheDocument();
      expect(screen.getByText(assessmentNote)).toBeInTheDocument();
    });

    it('does not render the Assessment accordion when assessment_note is missing', () => {
      renderWithI18n(<RootCauseCard event={baseEvent} />);

      expect(screen.queryByText('Assessment')).not.toBeInTheDocument();
    });
  });

  describe('Evidence trail', () => {
    const evidence: Evidence = {
      rule_name: 'auth_5xx_spike',
      description: 'COUNT(*) > 100 between T-15m and T',
      result: 'found',
      confirmed: true,
      stream_name: 'logs.auth',
    };

    it('renders the Evidence trail label and a count badge of evidences', () => {
      renderWithI18n(
        <RootCauseCard
          event={{ ...baseEvent, evidences: [evidence, { rule_name: 'r2' }] }}
        />
      );

      expect(screen.getByText('Evidence trail')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders each evidence with its rule_name as the row title', () => {
      renderWithI18n(<RootCauseCard event={{ ...baseEvent, evidences: [evidence] }} />);

      expect(screen.getByText('auth_5xx_spike')).toBeInTheDocument();
    });

    it('renders the evidence stream_name as an extra badge', () => {
      renderWithI18n(<RootCauseCard event={{ ...baseEvent, evidences: [evidence] }} />);

      expect(screen.getByText('logs.auth')).toBeInTheDocument();
    });

    it('falls back to "Unnamed evidence" when rule_name and description are missing', () => {
      renderWithI18n(
        <RootCauseCard event={{ ...baseEvent, evidences: [{ confirmed: false }] }} />
      );

      expect(screen.getByText('Unnamed evidence')).toBeInTheDocument();
    });
  });

  describe('separator between Assessment and Evidence', () => {
    it('renders a horizontal rule between Assessment and Evidence when both are present', () => {
      const { container } = renderWithI18n(
        <RootCauseCard
          event={{
            ...baseEvent,
            assessment_note: 'note',
            evidences: [{ rule_name: 'r' }],
          }}
        />
      );

      expect(container.querySelectorAll('hr')).toHaveLength(1);
    });

    it('does not render a separator when only the Assessment is present', () => {
      const { container } = renderWithI18n(
        <RootCauseCard event={{ ...baseEvent, assessment_note: 'note' }} />
      );

      expect(container.querySelectorAll('hr')).toHaveLength(0);
    });

    it('does not render a separator when only the Evidence trail is present', () => {
      const { container } = renderWithI18n(
        <RootCauseCard event={{ ...baseEvent, evidences: [{ rule_name: 'r' }] }} />
      );

      expect(container.querySelectorAll('hr')).toHaveLength(0);
    });
  });
});

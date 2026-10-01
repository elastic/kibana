/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSubject } from '../../../common/subjects/subject';
import { subjectAttachmentRenderer } from './subject_attachment_definition';
import { SubjectView } from './subject_view';

const base = {
  id: 'doc-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  createdAt: '2026-07-28T14:00:00.000Z',
};

const renderView = (subject: InvestigationSubject) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <SubjectView document={subject} variant="details" />
      </I18nProvider>
    </EuiProvider>
  );

describe('SubjectView', () => {
  it('renders an alert with its rule, status, reason, and details link', () => {
    renderView({
      ...base,
      subjectType: 'alert',
      subjectId: 'alert-1',
      snapshot: {
        rule_name: 'High latency',
        status: 'active',
        reason: 'p99 above 500 ms',
        url: '/app/observability/alerts/alert-1',
      },
    });

    expect(screen.getByTestId('investigationSubjectTitle')).toHaveTextContent('High latency');
    expect(screen.getByTestId('investigationSubjectAlertStatus')).toHaveTextContent('active');
    expect(screen.getByTestId('investigationSubjectAlertReason')).toHaveTextContent(
      'p99 above 500 ms'
    );
    expect(screen.getByTestId('investigationSubjectAlertLink')).toHaveAttribute(
      'href',
      '/app/observability/alerts/alert-1'
    );
  });

  it('does not link an alert URL that is not a path or http(s) URL', () => {
    renderView({
      ...base,
      subjectType: 'alert',
      subjectId: 'alert-1',
      snapshot: { rule_name: 'High latency', url: 'data:text/html,hello' },
    });

    expect(screen.queryByTestId('investigationSubjectAlertLink')).not.toBeInTheDocument();
  });

  it('falls back to the subject id for an alert without a snapshot', () => {
    renderView({ ...base, subjectType: 'alert', subjectId: 'alert-1' });

    expect(screen.getByTestId('investigationSubjectTitle')).toHaveTextContent('alert-1');
  });

  it('renders a significant event and a question by their summary', () => {
    renderView({
      ...base,
      subjectType: 'significant_event',
      subjectId: 'event-1',
      summary: 'Checkout errors spiked',
    });
    expect(screen.getByTestId('investigationSubject-significant_event')).toHaveTextContent(
      'Checkout errors spiked'
    );

    renderView({ ...base, subjectType: 'manual', subjectId: 'q-1', summary: 'Why is it slow?' });
    expect(screen.getByTestId('investigationSubject-manual')).toHaveTextContent('Why is it slow?');
  });

  it('renders a Slack thread with its channel, question, and thread link', () => {
    renderView({
      ...base,
      subjectType: 'slack_thread',
      subjectId: 'team:T1/channel:C1/thread:1700000000.000100',
      summary: 'Why is checkout slow?',
      slack: {
        channel: 'oncall',
        thread_ts: '1700000000.000100',
        permalink: 'https://example.slack.com/archives/C1/p1700000000000100',
      },
    });

    expect(screen.getByTestId('investigationSubjectSlackChannel')).toHaveTextContent('#oncall');
    expect(screen.getByTestId('investigationSubjectSummary')).toHaveTextContent(
      'Why is checkout slow?'
    );
    expect(screen.getByTestId('investigationSubjectSlackLink')).toHaveAttribute(
      'href',
      'https://example.slack.com/archives/C1/p1700000000000100'
    );
  });

  it('renders a Slack thread without a link when there is no permalink', () => {
    renderView({
      ...base,
      subjectType: 'slack_thread',
      subjectId: 'team:T1/channel:C1/thread:1',
      summary: 'Why?',
      slack: { channel: 'oncall', thread_ts: '1' },
    });

    expect(screen.queryByTestId('investigationSubjectSlackLink')).not.toBeInTheDocument();
  });
});

describe('subjectAttachmentRenderer', () => {
  it('labels subjects by type', () => {
    const { getLabel } = subjectAttachmentRenderer;

    expect(
      getLabel({
        ...base,
        subjectType: 'alert',
        subjectId: 'a',
        snapshot: { rule_name: 'High latency' },
      })
    ).toBe('Alert: High latency');
    expect(
      getLabel({
        ...base,
        subjectType: 'slack_thread',
        subjectId: 't',
        slack: { channel: 'oncall', thread_ts: '1' },
      })
    ).toBe('Slack thread: #oncall');
    expect(getLabel({ ...base, subjectType: 'manual', subjectId: 'q' })).toBe('Question');
  });
});

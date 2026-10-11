/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
  it('renders an alert as one compact row that links to the alert URL', () => {
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

    const row = screen.getByTestId('investigationSubject-alert');
    expect(row.tagName).toBe('A');
    expect(row).toHaveAttribute('href', '/app/observability/alerts/alert-1');
    expect(row).not.toHaveAttribute('target');
    expect(screen.getByTestId('investigationSubjectTitle')).toHaveTextContent('High latency');
    expect(screen.getByTestId('investigationSubjectTitle')).toHaveAttribute(
      'title',
      'High latency'
    );
    expect(screen.getByTestId('investigationSubjectTrigger')).toHaveTextContent('Trigger · Alert');
    // The row names the subject; the reason and status stay in the alert itself.
    expect(row).not.toHaveTextContent('p99 above 500 ms');
    expect(row).not.toHaveTextContent('active');
  });

  it('does not link an alert URL that is not a path or http(s) URL', () => {
    renderView({
      ...base,
      subjectType: 'alert',
      subjectId: 'alert-1',
      snapshot: { rule_name: 'High latency', url: 'data:text/html,hello' },
    });

    const row = screen.getByTestId('investigationSubject-alert');
    expect(row.tagName).toBe('DIV');
    expect(row).not.toHaveAttribute('href');
  });

  it('falls back to the subject id for an alert without a snapshot', () => {
    renderView({ ...base, subjectType: 'alert', subjectId: 'alert-1' });

    expect(screen.getByTestId('investigationSubjectTitle')).toHaveTextContent('alert-1');
  });

  it('renders a significant event and a question by their summary, without a link', () => {
    renderView({
      ...base,
      subjectType: 'significant_event',
      subjectId: 'event-1',
      summary: 'Checkout errors spiked',
    });
    const event = screen.getByTestId('investigationSubject-significant_event');
    expect(event.tagName).toBe('DIV');
    expect(event).toHaveTextContent('Checkout errors spiked');
    expect(event).toHaveTextContent('Trigger · Significant event');

    renderView({ ...base, subjectType: 'manual', subjectId: 'q-1', summary: 'Why is it slow?' });
    const question = screen.getByTestId('investigationSubject-manual');
    expect(question.tagName).toBe('DIV');
    expect(question).toHaveTextContent('Why is it slow?');
    expect(question).toHaveTextContent('Trigger · Question');
  });

  it('renders a Slack thread by its question and opens the thread in a new tab', () => {
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

    const row = screen.getByTestId('investigationSubject-slack_thread');
    expect(row.tagName).toBe('A');
    expect(row).toHaveAttribute('href', 'https://example.slack.com/archives/C1/p1700000000000100');
    expect(row).toHaveAttribute('target', '_blank');
    expect(row).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId('investigationSubjectTitle')).toHaveTextContent(
      'Why is checkout slow?'
    );
    expect(screen.getByTestId('investigationSubjectTrigger')).toHaveTextContent('Trigger · Slack');
    expect(within(row).getByTestId('investigationSubjectExternal')).toBeInTheDocument();
  });

  it('does not link a Slack permalink that is not an HTTPS URL', () => {
    renderView({
      ...base,
      subjectType: 'slack_thread',
      subjectId: 'team:T1/channel:C1/thread:1',
      summary: 'Why?',
      slack: {
        channel: 'oncall',
        thread_ts: '1',
        permalink: 'http://example.slack.com/archives/C1/p1',
      },
    });

    const row = screen.getByTestId('investigationSubject-slack_thread');
    expect(row.tagName).toBe('DIV');
    expect(row).not.toHaveAttribute('href');
    expect(within(row).queryByTestId('investigationSubjectExternal')).not.toBeInTheDocument();
  });

  it('renders a Slack thread without a link when there is no permalink', () => {
    renderView({
      ...base,
      subjectType: 'slack_thread',
      subjectId: 'team:T1/channel:C1/thread:1',
      summary: 'Why?',
      slack: { channel: 'oncall', thread_ts: '1' },
    });

    const row = screen.getByTestId('investigationSubject-slack_thread');
    expect(row.tagName).toBe('DIV');
    expect(within(row).queryByTestId('investigationSubjectExternal')).not.toBeInTheDocument();
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
    ).toBe('Slack: #oncall');
    expect(getLabel({ ...base, subjectType: 'manual', subjectId: 'q' })).toBe('Question');
  });
});

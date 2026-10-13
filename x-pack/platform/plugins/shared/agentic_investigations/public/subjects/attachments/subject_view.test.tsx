/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSubject } from '../../../common/subjects/subject';
import { subjectAttachmentRenderer } from './subject_attachment_definition';
import type { SubjectRowData } from './subject_title';
import { SubjectList, SubjectView } from './subject_view';

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

const alertStart = (id: string): string => `2026-07-28T14:0${id.slice(-1)}:00.000Z`;

const alertSubject = (id: string): SubjectRowData => ({
  type: 'alert',
  id,
  snapshot: {
    rule_name: `Rule ${id}`,
    url: `/app/observability/alerts/${id}`,
    start: alertStart(id),
  },
});

const renderList = (subjects: SubjectRowData[]) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <SubjectList subjects={subjects} />
      </I18nProvider>
    </EuiProvider>
  );

describe('SubjectList', () => {
  it('renders one row per subject when there is at most one alert', () => {
    renderList([alertSubject('a-1'), { type: 'manual', id: 'q-1', summary: 'Why is it slow?' }]);

    // A single alert keeps the plain trigger line; only nested alerts show their start.
    expect(screen.getByTestId('investigationSubject-alert')).toHaveTextContent(
      /^Rule a-1Trigger · Alert$/
    );
    expect(screen.getByTestId('investigationSubject-manual')).toHaveTextContent('Why is it slow?');
    expect(screen.queryByTestId('investigationSubject-alerts')).not.toBeInTheDocument();
  });

  it('collapses several alerts into one "N alerts" row that shows them when clicked', () => {
    renderList([
      alertSubject('a-1'),
      { type: 'manual', id: 'q-1', summary: 'Why is it slow?' },
      alertSubject('a-2'),
      alertSubject('a-3'),
    ]);

    const summary = screen.getByTestId('investigationSubject-alerts');
    expect(summary.tagName).toBe('BUTTON');
    expect(summary).toHaveAttribute('aria-expanded', 'false');
    expect(summary).toHaveTextContent('3 alerts');
    expect(summary).toHaveTextContent('Trigger');
    expect(screen.queryByTestId('investigationSubject-alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('investigationSubject-manual')).toBeInTheDocument();

    fireEvent.click(summary);

    expect(summary).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getAllByTestId('investigationSubject-alert').map((row) => row.getAttribute('href'))
    ).toEqual([
      '/app/observability/alerts/a-1',
      '/app/observability/alerts/a-2',
      '/app/observability/alerts/a-3',
    ]);
    // Alerts of one rule share a name, so each nested row also says when that alert started.
    expect(
      screen
        .getAllByTestId('investigationSubject-alert')
        .map((row) => within(row).getByTestId('investigationSubjectTrigger').textContent)
    ).toEqual(
      ['a-1', 'a-2', 'a-3'].map(
        (id) => `Trigger · Alert · ${moment(alertStart(id)).format('MMM D, HH:mm:ss')}`
      )
    );

    fireEvent.click(summary);

    expect(screen.queryByTestId('investigationSubject-alert')).not.toBeInTheDocument();
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

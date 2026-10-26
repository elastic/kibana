/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSubject } from '../../../common/subjects/subject';
import { createSubjectAttachmentRenderer } from './subject_attachment_definition';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { SubjectServices } from './subject_services';
import type { SubjectRowData } from './subject_title';
import { SubjectList, SubjectView } from './subject_view';

// The flyout itself is covered by `subject_details_flyout.test.tsx`; here only the row's choice
// between opening it and following its link matters.
jest.mock('./subject_details_flyout', () => ({
  SubjectDetailsFlyout: ({ alertId, detailsHref }: { alertId: string; detailsHref?: string }) => (
    <div data-test-subj="subjectFlyoutStub" data-href={detailsHref}>
      {alertId}
    </div>
  ),
}));

const base = {
  id: 'doc-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  createdAt: '2026-07-28T14:00:00.000Z',
};

const renderView = (subject: InvestigationSubject, services: SubjectServices = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <SubjectView document={subject} variant="details" />
        </KibanaContextProvider>
      </I18nProvider>
    </EuiProvider>
  );

/** A `share` whose locators resolve to `/located/<id>?<params>`. */
const createShare = () => {
  const navigate = jest.fn().mockResolvedValue(undefined);
  const services = {
    share: {
      url: {
        locators: {
          get: (locatorId: string) => ({
            getUrl: async (params: object) => `/located/${locatorId}?${JSON.stringify(params)}`,
            navigate,
          }),
        },
      },
    },
  } as unknown as SubjectServices;
  return { services, navigate };
};

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

  it("links an alert to its details page through the alerts locator, over the alert's own URL", async () => {
    const { services } = createShare();
    renderView(
      {
        ...base,
        subjectType: 'alert',
        subjectId: 'alert-1',
        snapshot: { rule_name: 'Latency', url: '/app/discover#/view/1' },
      },
      services
    );

    await waitFor(() =>
      expect(screen.getByTestId('investigationSubject-alert')).toHaveAttribute(
        'href',
        '/located/ALERTS_LOCATOR?{"alertId":"alert-1"}'
      )
    );
    const row = screen.getByTestId('investigationSubject-alert');
    expect(row).not.toHaveAttribute('target');
  });

  it('links an alerting v2 alert to its episode details page, by rule name', async () => {
    const { services } = createShare();
    renderView(
      {
        ...base,
        subjectType: 'alert',
        subjectId: 'episode-1',
        snapshot: { alert_version: 'v2', rule_name: 'CPU high', rule_id: 'rule-1' },
      },
      services
    );

    await waitFor(() =>
      expect(screen.getByTestId('investigationSubject-alert')).toHaveAttribute(
        'href',
        '/located/ALERTING_V2_EPISODES_LOCATOR?{"episodeId":"episode-1","host":{"app":"observabilityAlerting","pathPrefix":"/alerts"}}'
      )
    );
    expect(screen.getByTestId('investigationSubjectTitle')).toHaveTextContent('CPU high');
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

describe('SubjectView alert flyout', () => {
  const alert = {
    ...base,
    subjectType: 'alert' as const,
    subjectId: 'alert-1',
    snapshot: { rule_name: 'High latency', url: '/app/observability/alerts/alert-1' },
  };

  it('opens the alert in a flyout instead of navigating, and keeps the href', async () => {
    renderView(alert, { http: {} as never });

    const row = screen.getByTestId('investigationSubject-alert');
    expect(row).toHaveAttribute('href', '/app/observability/alerts/alert-1');

    const click = createEvent.click(row, { bubbles: true, cancelable: true });
    fireEvent(row, click);

    expect(click.defaultPrevented).toBe(true);
    const flyout = await screen.findByTestId('subjectFlyoutStub');
    expect(flyout).toHaveTextContent('alert-1');
    expect(flyout).toHaveAttribute('data-href', '/app/observability/alerts/alert-1');
  });

  it('lets the browser handle a new-tab click', async () => {
    renderView(alert, { http: {} as never });

    const row = screen.getByTestId('investigationSubject-alert');
    const click = createEvent.click(row, { bubbles: true, cancelable: true, metaKey: true });
    fireEvent(row, click);

    expect(click.defaultPrevented).toBe(false);
    expect(screen.queryByTestId('subjectFlyoutStub')).not.toBeInTheDocument();
  });

  it('navigates as before when the flyout has no services', async () => {
    const { services, navigate } = createShare();
    renderView(alert, services);

    await waitFor(() =>
      expect(screen.getByTestId('investigationSubject-alert')).toHaveAttribute(
        'href',
        '/located/ALERTS_LOCATOR?{"alertId":"alert-1"}'
      )
    );
    fireEvent.click(screen.getByTestId('investigationSubject-alert'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ alertId: 'alert-1' }));
    expect(screen.queryByTestId('subjectFlyoutStub')).not.toBeInTheDocument();
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

const renderList = (subjects: SubjectRowData[], services: SubjectServices = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <SubjectList subjects={subjects} />
        </KibanaContextProvider>
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

  it('lists several alerts inline when there is no alerts list to link to', () => {
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

  it('links several alerts to the alerts list, filtered to them', async () => {
    const { services, navigate } = createShare();
    renderList([alertSubject('a-1'), alertSubject('a-2'), alertSubject('a-3')], services);

    // The row starts as a plain toggle and becomes the link once the locator resolves.
    await waitFor(() =>
      expect(screen.getByTestId('investigationSubject-alerts')).toHaveAttribute('href')
    );
    const summary = screen.getByTestId('investigationSubject-alerts');

    expect(summary.tagName).toBe('A');
    expect(summary).toHaveTextContent('3 alerts');
    expect(JSON.parse(summary.getAttribute('href')!.split('?')[1])).toEqual({
      host: { app: 'observabilityAlerting', pathPrefix: '/alerts' },
      filters: {
        queryString:
          'alert.id: ("a-1" or "a-2" or "a-3") or kibana.alert.uuid: ("a-1" or "a-2" or "a-3")',
        status: 'all',
      },
      // A minute before the earliest alert start.
      timeRange: { from: '2026-07-28T14:00:00.000Z', to: 'now' },
    });
    // The alerts are on that page, not under the row.
    expect(screen.queryByTestId('investigationSubject-alert')).not.toBeInTheDocument();

    fireEvent.click(summary);

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            queryString: expect.stringContaining('kibana.alert.uuid: ("a-1" or "a-2" or "a-3")'),
          }),
        })
      )
    );
  });
});

describe('createSubjectAttachmentRenderer', () => {
  it('labels subjects by type', () => {
    const { getLabel } = createSubjectAttachmentRenderer({});

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

  it("links the loaded content through the plugin's locators", async () => {
    const SubjectContent = await createSubjectAttachmentRenderer(
      createShare().services
    ).loadContent();

    render(
      <EuiProvider>
        <I18nProvider>
          <SubjectContent
            document={{ ...base, subjectType: 'alert', subjectId: 'alert-1' }}
            variant="inline"
          />
        </I18nProvider>
      </EuiProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('investigationSubject-alert')).toHaveAttribute(
        'href',
        '/located/ALERTS_LOCATOR?{"alertId":"alert-1"}'
      )
    );
  });
});

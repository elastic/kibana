/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';

import type { AwsOnboardingRunAttachmentData } from '../../../../common/agent_builder/aws_onboarding_run_attachment';
import type { AwsOnboardingRunProgress } from '../../../../common/types/rest_spec/aws_onboarding_run';
import { sendGetAwsOnboardingRun } from '../../../hooks/use_request/aws_onboarding';

import { AwsOnboardingRunCard } from './card';

jest.mock('../../../hooks/use_request/aws_onboarding');

const STACK_ID =
  'arn:aws:cloudformation:eu-west-1:123456789012:stack/elastic-onboarding-ab12/0f1e2d3c';

const createData: AwsOnboardingRunAttachmentData = {
  execution_id: 'exec-1',
  workflow_id: 'wf-1',
  region: 'eu-west-1',
  for_services: ['Amazon GuardDuty', 'AWS Security Hub'],
  stack_action: 'create',
  started_at: '2026-11-18T10:00:00.000Z',
};

const POLICIES: AwsOnboardingRunProgress['policies']['items'] = [
  { service: 'guardduty', name: 'aws-guardduty-ab12', policy_id: 'p-1' },
  { service: 'securityhub', name: 'aws-securityhub-ab12', policy_id: 'p-2' },
];

const progress = (overrides: Partial<AwsOnboardingRunProgress>): AwsOnboardingRunProgress => ({
  status: 'running',
  stack: {
    phase: 'complete',
    stack_id: STACK_ID,
    stack_name: 'elastic-onboarding-ab12',
    resources: [],
  },
  connector: { phase: 'complete', name: 'elastic-identity-ab12', cloud_connector_id: 'cc-1' },
  policies: { phase: 'complete', items: POLICIES },
  data: { phase: 'pending' },
  ...overrides,
});

const respondWith = (body: AwsOnboardingRunProgress) =>
  jest.mocked(sendGetAwsOnboardingRun).mockResolvedValue({ data: body, error: null } as never);

const services = { http: { basePath: { prepend: (path: string) => `/s/team${path}` } } };

const renderCard = (data: AwsOnboardingRunAttachmentData = createData) => {
  const queryClient = new QueryClient({
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  return render(
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>
          <AwsOnboardingRunCard data={data} />
        </QueryClientProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

/** Lets the polling interval elapse twice over and the resulting fetches settle. */
const advancePastPollingInterval = async () => {
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
};

describe('AwsOnboardingRunCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-18T10:01:05.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('follows a running create from the stack resources to waiting for data', async () => {
    respondWith(
      progress({
        stack: {
          phase: 'in_progress',
          stack_id: STACK_ID,
          stack_name: 'elastic-onboarding-ab12',
          resources: [
            {
              logicalId: 'WiiOidcProviderFunctionLogGroup',
              status: 'CREATE_COMPLETE',
              updatedAt: '2026-11-18T10:00:10.000Z',
            },
          ],
        },
        connector: { phase: 'pending' },
        policies: { phase: 'pending', items: POLICIES },
      })
    );
    renderCard();

    expect(await screen.findByTestId('awsOnboardingRunCardBadge')).toHaveTextContent('Running');
    expect(screen.getByTestId('awsOnboardingRunCardStack')).toHaveTextContent(
      'Creating elastic-onboarding-ab12'
    );
    const rows = screen.getAllByTestId(/^awsOnboardingRunCardResource-/);
    expect(rows).toHaveLength(5);
    expect(within(rows[0]).getByLabelText('Complete')).toBeInTheDocument();
    for (const row of rows.slice(1)) {
      expect(within(row).getByLabelText('Pending')).toBeInTheDocument();
    }
    expect(screen.getByTestId('awsOnboardingRunCardConnector')).toHaveTextContent(
      'Waiting for the stack'
    );

    respondWith(progress({ data: { phase: 'waiting', waited_seconds: 65 } }));
    await advancePastPollingInterval();

    expect(screen.queryAllByTestId(/^awsOnboardingRunCardResource-/)).toHaveLength(0);
    expect(screen.getByTestId('awsOnboardingRunCardStack')).toHaveTextContent(
      'Created elastic-onboarding-ab12'
    );
    expect(screen.getByTestId('awsOnboardingRunCardConnector')).toHaveTextContent(
      'Created elastic-identity-ab12'
    );
    expect(screen.getByTestId('awsOnboardingRunCardPolicy-guardduty')).toHaveTextContent(
      'aws-guardduty-ab12 · Created'
    );
    expect(screen.getByTestId('awsOnboardingRunCardData')).toHaveTextContent(
      'Waiting · 1m 05s of up to 20m'
    );
  });

  it('shows the dashboard link once the run completed', async () => {
    respondWith(
      progress({
        status: 'completed',
        policies: { phase: 'complete', items: POLICIES.map((p) => ({ ...p, has_data: true })) },
        data: { phase: 'complete' },
        dashboard_path: '/app/dashboards#/view/aws',
      })
    );
    renderCard();

    expect(await screen.findByTestId('awsOnboardingRunCardBadge')).toHaveTextContent(/^Done$/);
    expect(screen.getByTestId('awsOnboardingRunCardDashboardLink')).toHaveAttribute(
      'href',
      '/s/team/app/dashboards#/view/aws'
    );
  });

  it.each(['completed', 'failed', 'cancelled', 'timed_out'] as const)(
    'stops polling once the run is %s',
    async (status) => {
      respondWith(progress({ status }));
      renderCard();

      await screen.findByTestId('awsOnboardingRunCardBadge');
      await advancePastPollingInterval();
      expect(sendGetAwsOnboardingRun).toHaveBeenCalledTimes(1);
    }
  );

  it('keeps polling when the first read fails', async () => {
    jest
      .mocked(sendGetAwsOnboardingRun)
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValue({ data: progress({}), error: null } as never);
    renderCard();

    await screen.findByTestId('awsOnboardingRunCardError');
    await advancePastPollingInterval();
    expect(sendGetAwsOnboardingRun).toHaveBeenCalledTimes(2);
    expect(await screen.findByTestId('awsOnboardingRunCardBadge')).toHaveTextContent('Running');
  });

  it('shows a reused identity that needed no stack change', async () => {
    respondWith(
      progress({
        stack: {
          phase: 'skipped',
          stack_id: STACK_ID,
          stack_name: 'elastic-onboarding-ab12',
          resources: [],
        },
        connector: { phase: 'reused', name: 'elastic-identity-ab12', cloud_connector_id: 'cc-1' },
      })
    );
    renderCard({ ...createData, stack_action: 'none' });

    expect(await screen.findByTestId('awsOnboardingRunCardStack')).toHaveTextContent(
      'No change needed'
    );
    expect(screen.getByTestId('awsOnboardingRunCardConnector')).toHaveTextContent(
      'Reusing elastic-identity-ab12'
    );
  });

  it('shows the reason when the run failed', async () => {
    respondWith(
      progress({
        status: 'failed',
        stack: {
          phase: 'failed',
          stack_id: STACK_ID,
          stack_name: 'elastic-onboarding-ab12',
          reason: 'WiiOidcProvider: Could not connect to the issuer',
          resources: [],
        },
        connector: { phase: 'pending' },
        policies: { phase: 'pending', items: POLICIES },
      })
    );
    renderCard();

    expect(await screen.findByTestId('awsOnboardingRunCardBadge')).toHaveTextContent('Failed');
    const stackRow = screen.getByTestId('awsOnboardingRunCardStack');
    expect(stackRow).toHaveTextContent('Failed: WiiOidcProvider: Could not connect to the issuer');
    expect(within(stackRow).getAllByLabelText('Failed').length).toBeGreaterThan(0);
    expect(within(stackRow).getByTestId('awsOnboardingRunCardConsoleLink')).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/eu-west-1\.console\.aws\.amazon\.com\//)
    );
  });

  it('shows an update of a reused identity and what it adds', async () => {
    respondWith(
      progress({
        stack: {
          phase: 'in_progress',
          stack_id: STACK_ID,
          stack_name: 'elastic-onboarding-ab12',
          resources: [],
        },
        connector: { phase: 'reused', name: 'elastic-identity-ab12', cloud_connector_id: 'cc-1' },
        policies: { phase: 'pending', items: POLICIES },
      })
    );
    renderCard({ ...createData, stack_action: 'update', adding: ['guardduty', 'securityhub'] });

    const stackRow = await screen.findByTestId('awsOnboardingRunCardStack');
    expect(stackRow).toHaveTextContent('Updating elastic-onboarding-ab12');
    expect(stackRow).toHaveTextContent('Adding: guardduty, securityhub');
    expect(screen.getByTestId('awsOnboardingRunCardConnector')).toHaveTextContent(
      'Reusing elastic-identity-ab12'
    );
  });

  it('names the services without data when the run completed partially', async () => {
    respondWith(
      progress({
        status: 'completed',
        policies: {
          phase: 'complete',
          items: [
            { ...POLICIES[0], has_data: true },
            { ...POLICIES[1], has_data: false },
          ],
        },
        data: { phase: 'partial' },
        dashboard_path: '/app/dashboards#/view/aws',
      })
    );
    renderCard();

    expect(await screen.findByTestId('awsOnboardingRunCardBadge')).toHaveTextContent(
      'Done, partial'
    );
    expect(screen.getByTestId('awsOnboardingRunCardData')).toHaveTextContent(
      'No data yet for securityhub'
    );
    expect(screen.getByTestId('awsOnboardingRunCardDashboardLink')).toBeInTheDocument();
  });

  it("links the console to the stack's own region when it differs from the run's", async () => {
    const otherRegionStack =
      'arn:aws:cloudformation:us-east-2:123456789012:stack/elastic-onboarding-ab12/0f1e2d3c';
    respondWith(
      progress({
        stack: {
          phase: 'complete',
          stack_id: otherRegionStack,
          stack_name: 'elastic-onboarding-ab12',
          resources: [],
        },
      })
    );
    renderCard();

    expect(await screen.findByTestId('awsOnboardingRunCardConsoleLink')).toHaveAttribute(
      'href',
      `https://us-east-2.console.aws.amazon.com/cloudformation/home?region=us-east-2#/stacks/stackinfo?stackId=${encodeURIComponent(
        otherRegionStack
      )}`
    );
  });

  it("links the console to the run's region when the stack id has no valid region", async () => {
    const malformedStack = 'arn:aws:cloudformation:evil.example/x:123456789012:stack/ab12/0f1e';
    respondWith(
      progress({
        stack: {
          phase: 'complete',
          stack_id: malformedStack,
          stack_name: 'elastic-onboarding-ab12',
          resources: [],
        },
      })
    );
    renderCard();

    expect(await screen.findByTestId('awsOnboardingRunCardConsoleLink')).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/eu-west-1\.console\.aws\.amazon\.com\//)
    );
  });
});

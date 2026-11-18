/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';

import type { AwsOnboardingStackAttachmentData } from '../../../../common/agent_builder/aws_onboarding_stack_attachment';
import type { GetAwsOnboardingStackResponse } from '../../../../common/types/rest_spec/aws_onboarding';
import { sendGetAwsOnboardingStack } from '../../../hooks/use_request/aws_onboarding';

import { AwsOnboardingStackCard } from './card';

jest.mock('../../../hooks/use_request/aws_onboarding');

const STACK_ID =
  'arn:aws:cloudformation:eu-west-1:123456789012:stack/elastic-onboarding-ab12/0f1e2d3c';

const createData: AwsOnboardingStackAttachmentData = {
  execution_id: 'exec-1',
  stack_id: STACK_ID,
  stack_name: 'elastic-onboarding-ab12',
  region: 'eu-west-1',
  action: 'create',
  for_services: ['Amazon GuardDuty'],
  started_at: '2026-11-18T10:00:00.000Z',
};

const respondWith = (body: GetAwsOnboardingStackResponse) =>
  jest.mocked(sendGetAwsOnboardingStack).mockResolvedValue({ data: body, error: null } as never);

const renderCard = (data: AwsOnboardingStackAttachmentData = createData) => {
  const queryClient = new QueryClient({
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AwsOnboardingStackCard data={data} />
      </QueryClientProvider>
    </I18nProvider>
  );
};

/** Lets the polling interval elapse twice over and the resulting fetches settle. */
const advancePastPollingInterval = async () => {
  await act(async () => {
    jest.advanceTimersByTime(11_000);
  });
};

describe('AwsOnboardingStackCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-18T10:01:05.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows every known resource while creating, the unreported ones as pending, and keeps polling', async () => {
    respondWith({
      status: 'in_progress',
      stackStatus: 'CREATE_IN_PROGRESS',
      resources: [
        {
          logicalId: 'WiiOidcProviderFunctionLogGroup',
          status: 'CREATE_COMPLETE',
          updatedAt: '2026-11-18T10:00:10.000Z',
        },
        {
          logicalId: 'WiiOidcProviderFunctionRole',
          status: 'CREATE_IN_PROGRESS',
          updatedAt: '2026-11-18T10:00:12.000Z',
        },
      ],
    });
    renderCard();

    expect(await screen.findByTestId('awsOnboardingStackCardBadge')).toHaveTextContent('Creating');
    const rows = screen.getAllByTestId(/^awsOnboardingStackCardResource-/);
    expect(rows.map((row) => row.getAttribute('data-test-subj'))).toEqual([
      'awsOnboardingStackCardResource-WiiOidcProviderFunctionLogGroup',
      'awsOnboardingStackCardResource-WiiOidcProviderFunctionRole',
      'awsOnboardingStackCardResource-WiiOidcProviderFunction',
      'awsOnboardingStackCardResource-WiiOidcProvider',
      'awsOnboardingStackCardResource-ElasticWorkloadIdentityRole',
    ]);
    expect(within(rows[2]).getByTestId('awsOnboardingStackCardGlyph-pending')).toBeInTheDocument();
    expect(within(rows[0]).getByTestId('awsOnboardingStackCardGlyph-complete')).toBeInTheDocument();
    expect(screen.getByTestId('awsOnboardingStackCardConsoleLink')).toHaveAttribute(
      'href',
      `https://eu-west-1.console.aws.amazon.com/cloudformation/home?region=eu-west-1#/stacks/stackinfo?stackId=${encodeURIComponent(
        STACK_ID
      )}`
    );

    await advancePastPollingInterval();
    expect(jest.mocked(sendGetAwsOnboardingStack).mock.calls.length).toBeGreaterThan(1);
  });

  it('shows only the resources an update touches and what it adds', async () => {
    respondWith({
      status: 'in_progress',
      stackStatus: 'UPDATE_IN_PROGRESS',
      resources: [
        {
          logicalId: 'ElasticWorkloadIdentityRole',
          status: 'UPDATE_IN_PROGRESS',
          updatedAt: '2026-11-18T10:00:12.000Z',
        },
      ],
    });
    renderCard({ ...createData, action: 'update', adding: ['guardduty', 'securityhub'] });

    expect(await screen.findByTestId('awsOnboardingStackCardBadge')).toHaveTextContent('Updating');
    expect(
      screen
        .getAllByTestId(/^awsOnboardingStackCardResource-/)
        .map((row) => row.getAttribute('data-test-subj'))
    ).toEqual(['awsOnboardingStackCardResource-ElasticWorkloadIdentityRole']);
    expect(screen.getByTestId('awsOnboardingStackCardAdding')).toHaveTextContent(
      'guardduty, securityhub'
    );
  });

  it('shows the role ARN and stops polling once the stack is created', async () => {
    respondWith({
      status: 'complete',
      stackStatus: 'CREATE_COMPLETE',
      resources: [],
      outputs: { roleArn: 'arn:aws:iam::123456789012:role/ElasticWorkloadIdentityRole' },
    });
    renderCard();

    expect(await screen.findByTestId('awsOnboardingStackCardBadge')).toHaveTextContent('Created');
    expect(screen.getByTestId('awsOnboardingStackCardRoleArn')).toHaveTextContent(
      'arn:aws:iam::123456789012:role/ElasticWorkloadIdentityRole'
    );

    await advancePastPollingInterval();
    expect(sendGetAwsOnboardingStack).toHaveBeenCalledTimes(1);
  });

  it("shows the failed resource's reason when the stack failed", async () => {
    respondWith({
      status: 'failed',
      stackStatus: 'ROLLBACK_COMPLETE',
      reason: 'WiiOidcProvider: Could not connect to the issuer',
      resources: [
        {
          logicalId: 'WiiOidcProvider',
          status: 'CREATE_FAILED',
          reason: 'Could not connect to the issuer',
          updatedAt: '2026-11-18T10:00:30.000Z',
        },
      ],
    });
    renderCard();

    expect(await screen.findByTestId('awsOnboardingStackCardBadge')).toHaveTextContent('Failed');
    expect(screen.getByTestId('awsOnboardingStackCardFailed')).toHaveTextContent(
      'WiiOidcProvider: Could not connect to the issuer'
    );
    expect(
      within(screen.getByTestId('awsOnboardingStackCardResource-WiiOidcProvider')).getByText(
        'Could not connect to the issuer'
      )
    ).toBeInTheDocument();
  });

  it('says the stack no longer exists and stops polling when it is not found', async () => {
    respondWith({ status: 'not_found', resources: [] });
    renderCard();

    expect(await screen.findByText('This stack no longer exists')).toBeInTheDocument();

    await advancePastPollingInterval();
    expect(sendGetAwsOnboardingStack).toHaveBeenCalledTimes(1);
  });
});

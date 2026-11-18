/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';

import type { AwsOnboardingRunProgress } from '../../../../common/types/rest_spec/aws_onboarding_run';
import { setHttpClient } from '../../../hooks/use_request/use_request';

import { createAwsOnboardingRunAttachmentDefinition } from './definition';
import type { AwsOnboardingRunAttachment } from './definition';

// The attachment exactly as the state tool wrote it in a real update run.
const attachment = {
  id: 'att-1',
  type: 'fleet_aws_onboarding_run',
  data: {
    execution_id: 'exec-1',
    workflow_id: 'system-fleet-aws-agentless-onboarding',
    region: 'us-east-1',
    for_services: ['AWS Lambda'],
    stack_action: 'update',
    adding: ['lambda (aws/metrics)'],
    started_at: '2026-11-18T21:13:00.364Z',
  },
} as unknown as AwsOnboardingRunAttachment;

// The run route's body exactly as the server returned it for that run.
const progress: AwsOnboardingRunProgress = {
  status: 'waiting',
  stack: {
    phase: 'complete',
    stack_id:
      'arn:aws:cloudformation:us-east-1:704479110758:stack/elastic-onboarding-97c34291/3bfd84c0',
    stack_name: 'elastic-onboarding-97c34291',
    stack_status: 'UPDATE_COMPLETE',
    resources: [],
  },
  connector: { phase: 'reused', name: 'aws-704479110758', cloud_connector_id: 'cc-1' },
  policies: {
    phase: 'complete',
    items: [
      { service: 'lambda', name: 'aws-lambda-agentless-x', policy_id: 'p-1', has_data: false },
    ],
  },
  ingest: { phase: 'waiting', waited_seconds: 341 },
};

describe('createAwsOnboardingRunAttachmentDefinition', () => {
  it('renders the card from the run route body through the real request helper', async () => {
    // Not a mocked sender: the shared request helper unwraps a top-level `data` key of any
    // response body, which is how a field named `data` in the progress once emptied the card.
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue(progress);
    setHttpClient(http);
    const definition = createAwsOnboardingRunAttachmentDefinition();

    // Agent Builder renders this element on its own, with no Fleet provider around it.
    render(<>{definition.renderInlineContent!({ attachment } as never)}</>);

    expect(await screen.findByText('AWS onboarding run')).toBeInTheDocument();
    expect(await screen.findByText(/Reusing aws-704479110758/)).toBeInTheDocument();
  });
});

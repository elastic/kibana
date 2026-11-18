/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

import type {
  AWS_ONBOARDING_RUN_ATTACHMENT_TYPE,
  AwsOnboardingRunAttachmentData,
} from '../../../../common/agent_builder/aws_onboarding_run_attachment';

// The card pulls in the request hooks and callouts; load it only when an attachment renders.
const LazyCard = React.lazy(() =>
  import('./card').then((module) => ({ default: module.AwsOnboardingRunCard }))
);

export type AwsOnboardingRunAttachment = Attachment<
  typeof AWS_ONBOARDING_RUN_ATTACHMENT_TYPE,
  AwsOnboardingRunAttachmentData
>;

// One client for every run card, so a card re-rendered in the conversation reuses its query.
const queryClient = new QueryClient();

export const createAwsOnboardingRunAttachmentDefinition =
  (): AttachmentUIDefinition<AwsOnboardingRunAttachment> => ({
    getLabel: () =>
      i18n.translate('xpack.fleet.awsOnboardingRunAttachment.label', {
        defaultMessage: 'AWS onboarding run',
      }),
    getIcon: () => 'logoAWS',
    renderInlineContent: ({ attachment }) => (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <LazyCard data={attachment.data} />
        </Suspense>
      </QueryClientProvider>
    ),
  });

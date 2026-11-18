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
  AWS_ONBOARDING_STACK_ATTACHMENT_TYPE,
  AwsOnboardingStackAttachmentData,
} from '../../../../common/agent_builder/aws_onboarding_stack_attachment';

// The card pulls in the request hooks and callouts; load it only when an attachment renders.
const LazyCard = React.lazy(() =>
  import('./card').then((module) => ({ default: module.AwsOnboardingStackCard }))
);

export type AwsOnboardingStackAttachment = Attachment<
  typeof AWS_ONBOARDING_STACK_ATTACHMENT_TYPE,
  AwsOnboardingStackAttachmentData
>;

// One client for every stack card, so a card re-rendered in the conversation reuses its query.
const queryClient = new QueryClient();

export const createAwsOnboardingStackAttachmentDefinition =
  (): AttachmentUIDefinition<AwsOnboardingStackAttachment> => ({
    getLabel: () =>
      i18n.translate('xpack.fleet.awsOnboardingStackAttachment.label', {
        defaultMessage: 'Federated Identity stack',
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

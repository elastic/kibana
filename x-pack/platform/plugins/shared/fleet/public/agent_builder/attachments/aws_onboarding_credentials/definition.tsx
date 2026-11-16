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
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';

import type {
  AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
  AwsOnboardingCredentialsAttachmentData,
} from '../../../../common/agent_builder/aws_onboarding_credentials_attachment';
import type { FleetStartServices } from '../../../plugin';

// The card and form pull in the hooks and callouts; load them only when an attachment renders.
const LazyCard = React.lazy(() =>
  import('./card').then((module) => ({ default: module.AwsOnboardingCredentialsCard }))
);
const LazyForm = React.lazy(() =>
  import('./form').then((module) => ({ default: module.AwsOnboardingCredentialsForm }))
);

export type AwsOnboardingCredentialsAttachment = Attachment<
  typeof AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
  AwsOnboardingCredentialsAttachmentData
>;

// The card and the canvas form render in separate React roots; one shared client keeps their
// credentials and verify queries in sync.
const queryClient = new QueryClient();

const Providers: React.FC<{ startServices: FleetStartServices; children: React.ReactNode }> = ({
  startServices,
  children,
}) => (
  <KibanaContextProvider services={startServices}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </KibanaContextProvider>
);

export const createAwsOnboardingCredentialsAttachmentDefinition = (
  startServices: FleetStartServices
): AttachmentUIDefinition<AwsOnboardingCredentialsAttachment> => ({
  getLabel: () =>
    i18n.translate('xpack.fleet.awsOnboardingCredentialsAttachment.label', {
      defaultMessage: 'AWS onboarding access',
    }),
  getIcon: () => 'logoAWS',
  canvasWidth: '560px',
  renderInlineContent: ({ attachment }) => (
    <Providers startServices={startServices}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyCard data={attachment.data} />
      </Suspense>
    </Providers>
  ),
  renderCanvasContent: ({ attachment }, { closeCanvas }) => (
    <Providers startServices={startServices}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyForm region={attachment.data.region} onSaved={closeCanvas} />
      </Suspense>
    </Providers>
  ),
  getActionButtons: ({ isCanvas, openCanvas }) =>
    isCanvas || !openCanvas
      ? []
      : [
          {
            label: i18n.translate('xpack.fleet.awsOnboardingCredentialsAttachment.enterOutputs', {
              defaultMessage: 'Enter stack outputs',
            }),
            icon: 'key',
            type: ActionButtonType.PRIMARY,
            handler: openCanvas,
          },
        ],
});

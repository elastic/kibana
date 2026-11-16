/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

import { AwsOnboardingCredentialsCard } from './card';
import { AwsOnboardingCredentialsForm } from './form';

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
      <AwsOnboardingCredentialsCard data={attachment.data} />
    </Providers>
  ),
  renderCanvasContent: ({ attachment }, { closeCanvas }) => (
    <Providers startServices={startServices}>
      <AwsOnboardingCredentialsForm region={attachment.data.region} onSaved={closeCanvas} />
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

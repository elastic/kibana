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
  AWS_ONBOARDING_SETTINGS_ATTACHMENT_TYPE,
  AwsOnboardingSettingsAttachmentData,
} from '../../../../common/agent_builder/aws_onboarding_settings_attachment';
import type { FleetStartServices } from '../../../plugin';

import { settingsDraftKey } from './drafts';

// The card and form pull in the field editors; load them only when an attachment renders.
const LazyCard = React.lazy(() =>
  import('./card').then((module) => ({ default: module.AwsOnboardingSettingsCard }))
);
const LazyForm = React.lazy(() =>
  import('./form').then((module) => ({ default: module.AwsOnboardingSettingsForm }))
);

export type AwsOnboardingSettingsAttachment = Attachment<
  typeof AWS_ONBOARDING_SETTINGS_ATTACHMENT_TYPE,
  AwsOnboardingSettingsAttachmentData
>;

// The card and the canvas form render in separate React roots, so each gets the same providers.
const queryClient = new QueryClient();

const Providers: React.FC<{ startServices: FleetStartServices; children: React.ReactNode }> = ({
  startServices,
  children,
}) => (
  <KibanaContextProvider services={startServices}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </KibanaContextProvider>
);

export const createAwsOnboardingSettingsAttachmentDefinition = (
  startServices: FleetStartServices
): AttachmentUIDefinition<AwsOnboardingSettingsAttachment> => ({
  getLabel: () =>
    i18n.translate('xpack.fleet.awsOnboardingSettingsAttachment.label', {
      defaultMessage: 'AWS onboarding settings',
    }),
  getIcon: () => 'logoAWS',
  canvasWidth: '640px',
  renderInlineContent: ({ attachment }) => (
    <Providers startServices={startServices}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyCard
          key={settingsDraftKey(attachment)}
          attachmentId={settingsDraftKey(attachment)}
          data={attachment.data}
        />
      </Suspense>
    </Providers>
  ),
  renderCanvasContent: ({ attachment }, { closeCanvas }) => (
    <Providers startServices={startServices}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyForm
          key={settingsDraftKey(attachment)}
          attachmentId={settingsDraftKey(attachment)}
          data={attachment.data}
          onSubmitted={closeCanvas}
        />
      </Suspense>
    </Providers>
  ),
  getActionButtons: ({ isCanvas, openCanvas }) =>
    isCanvas || !openCanvas
      ? []
      : [
          {
            label: i18n.translate('xpack.fleet.awsOnboardingSettingsAttachment.review', {
              defaultMessage: 'Review settings',
            }),
            icon: 'pencil',
            type: ActionButtonType.PRIMARY,
            handler: openCanvas,
          },
        ],
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ShareContext } from '@kbn/share-plugin/public';
import type { ExportShareDerivatives } from '@kbn/share-plugin/public/types';
import type { ReportingSharingData } from '@kbn/reporting-public/share/share_context_menu';
import { EuiButton } from '@elastic/eui';
import type { ReportingAPIClient } from '@kbn/reporting-public';
import { ScheduledReportFlyoutShareWrapper } from '../components/scheduled_report_flyout_share_wrapper';
import { SCHEDULE_EXPORT_BUTTON_LABEL } from '../translations';
import type { ReportingPublicPluginSetupDependencies } from '../../plugin';

export interface CreateScheduledReportProviderOptions {
  apiClient: ReportingAPIClient;
  services: ReportingPublicPluginSetupDependencies;
}

export const createScheduledReportShareIntegration = ({
  apiClient,
  services,
}: CreateScheduledReportProviderOptions): ExportShareDerivatives => {
  return {
    id: 'scheduledReports',
    groupId: 'exportDerivatives',
    shareType: 'integration',
    config: ({
      objectType,
      objectId,
      isDirty,
      onClose,
      shareableUrl,
      shareableUrlForSavedObject,
      ...shareOpts
    }: ShareContext): ReturnType<ExportShareDerivatives['config']> => {
      const { sharingData } = shareOpts as unknown as { sharingData: ReportingSharingData };
      return {
        label: ({ openFlyout }) => (
          <EuiButton iconType="calendar" onClick={openFlyout}>
            {SCHEDULE_EXPORT_BUTTON_LABEL}
          </EuiButton>
        ),
        flyoutContent: ({ closeFlyout }) => {
          return (
            <ScheduledReportFlyoutShareWrapper
              apiClient={apiClient}
              services={services}
              sharingData={sharingData}
              onClose={closeFlyout}
            />
          );
        },
      };
    },
  };
};

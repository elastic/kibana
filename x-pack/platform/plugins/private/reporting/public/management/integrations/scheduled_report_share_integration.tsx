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
import { HttpSetup } from '@kbn/core-http-browser';
import { SCHEDULED_REPORT_VALID_LICENSES } from '@kbn/reporting-common';
import type { ReportTypeId } from '../../types';
import { getKey as getReportingHealthQueryKey } from '../hooks/use_get_reporting_health_query';
import { queryClient } from '../../query_client';
import { ScheduledReportFlyoutShareWrapper } from '../components/scheduled_report_flyout_share_wrapper';
import { SCHEDULE_EXPORT_BUTTON_LABEL } from '../translations';
import type { ReportingPublicPluginStartDependencies } from '../../plugin';
import { getReportingHealth } from '../apis/get_reporting_health';
import { supportedReportTypes } from '../report_params';

export interface CreateScheduledReportProviderOptions {
  apiClient: ReportingAPIClient;
  services: ReportingPublicPluginStartDependencies;
}

export const shouldRegisterScheduledReportShareIntegration = async (http: HttpSetup) => {
  const { isSufficientlySecure, hasPermanentEncryptionKey } = await queryClient.fetchQuery({
    queryKey: getReportingHealthQueryKey(),
    queryFn: () => getReportingHealth({ http }),
  });
  return isSufficientlySecure && hasPermanentEncryptionKey;
};

export const createScheduledReportShareIntegration = ({
  apiClient,
  services,
}: CreateScheduledReportProviderOptions): ExportShareDerivatives => {
  return {
    id: 'scheduledReports',
    groupId: 'exportDerivatives',
    shareType: 'integration',
    config: (shareOpts: ShareContext): ReturnType<ExportShareDerivatives['config']> => {
      const { sharingData } = shareOpts as unknown as { sharingData: ReportingSharingData };
      return {
        label: ({ openFlyout }) => (
          <EuiButton iconType="calendar" onClick={openFlyout} data-test-subj="scheduleExport">
            {SCHEDULE_EXPORT_BUTTON_LABEL}
          </EuiButton>
        ),
        shouldRender: ({ availableExportItems }) => {
          const supportedExportItemsForScheduling = availableExportItems.filter((exportItem) =>
            supportedReportTypes.includes(exportItem.config.exportType as ReportTypeId)
          );
          return supportedExportItemsForScheduling.length > 0;
        },
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
        flyoutSizing: { size: 'm', maxWidth: 500 },
      };
    },
    prerequisiteCheck: ({ license }) => {
      if (!license || !license.type) {
        return false;
      }
      return SCHEDULED_REPORT_VALID_LICENSES.includes(license.type);
    },
  };
};

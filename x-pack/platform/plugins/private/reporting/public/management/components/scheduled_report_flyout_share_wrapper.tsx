/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiFlyoutBody } from '@elastic/eui';
import { useShareTypeContext } from '@kbn/share-plugin/public';
import { ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ReportingSharingData } from '@kbn/reporting-public/share/share_context_menu';
import { QueryClientProvider } from '@tanstack/react-query';
import { isEmpty } from 'lodash';
import { supportedReportTypes } from '../report_params';
import { queryClient } from '../../query_client';
import type { ReportingPublicPluginStartDependencies } from '../../plugin';
import { ScheduledReportFlyoutContent } from './scheduled_report_flyout_content';
import { ReportTypeId } from '../../types';
import * as i18n from '../translations';

export interface ScheduledReportMenuItem {
  apiClient: ReportingAPIClient;
  services: ReportingPublicPluginStartDependencies;
  sharingData: ReportingSharingData;
  onClose: () => void;
}

export const ScheduledReportFlyoutShareWrapper = ({
  apiClient,
  services: reportingServices,
  sharingData,
  onClose,
}: ScheduledReportMenuItem) => {
  const upstreamServices = useKibana().services;
  const services = useMemo(
    () => ({
      ...reportingServices,
      ...upstreamServices,
    }),
    [reportingServices, upstreamServices]
  );
  const { shareMenuItems, objectType } = useShareTypeContext('integration', 'export');

  const availableReportTypes = useMemo(() => {
    return shareMenuItems
      .filter((item) => supportedReportTypes.includes(item.config.exportType as ReportTypeId))
      .map((item) => ({
        id: item.config.exportType,
        label: item.config.label,
      }));
  }, [shareMenuItems]);

  const scheduledReport = useMemo(
    () => ({
      title: sharingData.title,
    }),
    [sharingData]
  );

  if (isEmpty(reportingServices)) {
    return null;
  }

  if (!availableReportTypes || availableReportTypes.length === 0) {
    return (
      <EuiFlyoutBody>
        <EuiCallOut
          title={i18n.SCHEDULED_REPORT_NO_REPORT_TYPES_TITLE}
          color="warning"
          iconType="warning"
        >
          <p>{i18n.SCHEDULED_REPORT_NO_REPORT_TYPES_MESSAGE}</p>
        </EuiCallOut>
      </EuiFlyoutBody>
    );
  }

  return (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <ScheduledReportFlyoutContent
          apiClient={apiClient}
          objectType={objectType}
          sharingData={sharingData}
          availableReportTypes={availableReportTypes}
          scheduledReport={scheduledReport}
          onClose={onClose}
        />
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};

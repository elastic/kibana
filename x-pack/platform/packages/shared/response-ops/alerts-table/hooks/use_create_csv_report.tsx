/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMutation } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { REPORTING_MANAGEMENT_HOME } from '@kbn/reporting-common';
import { createCsvReport, type CreateCsvReportParams } from '../apis/create_csv_report';
import { mutationKeys } from '../constants';

const CSV_EXPORT_SUCCESS = i18n.translate('responseOpsAlertsTable.csvExport.successTitle', {
  defaultMessage: 'CSV report queued for generation',
});

const CSV_EXPORT_ERROR = i18n.translate('responseOpsAlertsTable.csvExport.errorTitle', {
  defaultMessage: 'Failed to generate CSV report',
});

export interface UseCreateCsvReportParams {
  http: HttpStart;
  notifications: NotificationsStart;
  rendering: RenderingService | undefined;
}

type CreateCsvReportVariables = Omit<CreateCsvReportParams, 'http'>;

export const useCreateCsvReport = ({
  http,
  notifications: { toasts },
  rendering,
}: UseCreateCsvReportParams) => {
  return useMutation(
    mutationKeys.createCsvReport(),
    (variables: CreateCsvReportVariables) => createCsvReport({ http, ...variables }),
    {
      onSuccess: () => {
        const reportingUrl = http.basePath.prepend(REPORTING_MANAGEMENT_HOME);
        if (!rendering) return;
        toasts.addSuccess({
          title: CSV_EXPORT_SUCCESS,
          text: toMountPoint(
            <FormattedMessage
              id="responseOpsAlertsTable.csvExport.successBody"
              defaultMessage="Track its progress in {link}."
              values={{
                link: (
                  <EuiLink href={reportingUrl} target="_blank">
                    <FormattedMessage
                      id="responseOpsAlertsTable.csvExport.reportingLink"
                      defaultMessage="Stack Management > Reporting"
                    />
                  </EuiLink>
                ),
              }}
            />,
            rendering
          ),
          'data-test-subj': 'csvExportStarted',
        });
      },
      onError: (error: Error & { body?: { message?: string } }) => {
        toasts.addDanger({
          title: CSV_EXPORT_ERROR,
          text: error?.body?.message || error?.message || 'Unknown error',
          'data-test-subj': 'csvExportFailed',
        });
      },
    }
  );
};

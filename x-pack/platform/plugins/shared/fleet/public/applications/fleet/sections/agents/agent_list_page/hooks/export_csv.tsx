/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import { REPORTING_MANAGEMENT_HOME } from '@kbn/reporting-common';

import { useStartServices, sendPostGenerateAgentsReport } from '../../../../../../hooks';
import type { Agent } from '../../../../../../../common';
import type { ExportField } from '../../components/agent_export_csv_modal';

export function useExportCSV() {
  const startServices = useStartServices();
  const { notifications, uiSettings, http } = startServices;

  return async (
    agents: Agent[] | string,
    columns: ExportField[],
    sortOptions?: { field?: string; direction?: 'asc' | 'desc' }
  ) => {
    const _agents = Array.isArray(agents) ? agents.map((agent) => agent.id) : agents;
    const fields = columns.map((column) => column.field);
    const timezone =
      uiSettings.get('dateFormat:tz') === 'Browser'
        ? moment.tz.guess()
        : uiSettings.get('dateFormat:tz');
    const reportingUrl = http.basePath.prepend(REPORTING_MANAGEMENT_HOME);

    try {
      await sendPostGenerateAgentsReport({
        agents: _agents,
        fields,
        timezone,
        sort: sortOptions,
      });

      return notifications.toasts.addSuccess({
        title: i18n.translate(
          'xpack.fleet.modalContent.successfullyQueuedReportNotificationTitle',
          {
            defaultMessage: 'Queued report for CSV',
          }
        ),
        text: toMountPoint(
          <FormattedMessage
            id="xpack.fleet.modalContent.successfullyQueuedReportNotificationDescription"
            defaultMessage="Track its progress in {path}."
            values={{
              path: (
                <a href={reportingUrl}>
                  <FormattedMessage
                    id="xpack.fleet.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                    defaultMessage="Stack Management &gt; Reporting"
                  />
                </a>
              ),
            }}
          />,
          startServices
        ),
        'data-test-subj': 'queueReportSuccess',
      });
    } catch (error) {
      return notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.modalContent.notification.reportingErrorTitle', {
          defaultMessage: 'Unable to create report',
        }),
        toastMessage: (
          // eslint-disable-next-line react/no-danger
          <span dangerouslySetInnerHTML={{ __html: error.body?.message }} />
        ) as unknown as string,
      });
    }
  };
}

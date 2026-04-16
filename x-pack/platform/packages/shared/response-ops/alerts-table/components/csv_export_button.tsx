/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { EuiButtonIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { encode as risonEncode } from '@kbn/rison';
import { ALERT_RULE_TYPE_ID, ALERT_RULE_CONSUMER } from '@kbn/rule-data-utils';
import { fetchAlertsIndexNames } from '@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_index_names/fetch_alerts_index_names';
import type { HttpStart } from '@kbn/core-http-browser';
import moment from 'moment';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

const createSuccessToastText = (http: HttpStart): MountPoint => {
  const reportingUrl = http.basePath.prepend(REPORTING_MANAGEMENT_HOME);
  return (element) => {
    ReactDOM.render(
      <I18nProvider>
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
        />
      </I18nProvider>,
      element
    );
    return () => {
      ReactDOM.unmountComponentAtNode(element);
    };
  };
};

const REPORTING_MANAGEMENT_HOME = '/app/management/insightsAndAlerting/reporting';

const CSV_EXPORT_LABEL = i18n.translate('responseOpsAlertsTable.csvExport.buttonLabel', {
  defaultMessage: 'CSV export',
});

const CSV_EXPORT_SUCCESS = i18n.translate('responseOpsAlertsTable.csvExport.successTitle', {
  defaultMessage: 'CSV report queued for generation',
});

const CSV_EXPORT_ERROR = i18n.translate('responseOpsAlertsTable.csvExport.errorTitle', {
  defaultMessage: 'Failed to generate CSV report',
});

export const CsvExportButton: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { services, ruleTypeIds, consumers, query, sort, columns } = useAlertsTableContext();
  const { http, notifications, settings } = services;

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const indexNames = await fetchAlertsIndexNames({ http, ruleTypeIds });
      const indexPattern = indexNames.join(',');

      const timeZoneSetting = settings.client.get('dateFormat:tz');
      const browserTimezone = moment.tz.zone(timeZoneSetting)?.name ?? moment.tz.guess(true);

      const columnIds = columns.map((col) => col.id);

      const filters = [];

      if (query.bool) {
        filters.push({
          query: { bool: query.bool },
          meta: { disabled: false },
        });
      }

      if (query.ids) {
        filters.push({
          query: { ids: query.ids },
          meta: { disabled: false },
        });
      }

      if (ruleTypeIds.length > 0) {
        filters.push({
          query: { terms: { [ALERT_RULE_TYPE_ID]: ruleTypeIds } },
          meta: { disabled: false },
        });
      }

      if (consumers && consumers.length > 0) {
        filters.push({
          query: { terms: { [ALERT_RULE_CONSUMER]: consumers } },
          meta: { disabled: false },
        });
      }

      const searchSource = {
        index: {
          title: indexPattern,
          timeFieldName: '@timestamp',
        },
        query: { query: '', language: 'kuery' },
        filter: filters,
        sort,
      };

      const jobParams = {
        title: 'Alerts',
        objectType: 'alert',
        browserTimezone,
        searchSource,
        columns: columnIds,
      };

      const jobParamsRison = risonEncode(jobParams);
      await http.post('/internal/reporting/generate/csv_searchsource', {
        body: JSON.stringify({ jobParams: jobParamsRison }),
      });

      notifications.toasts.addSuccess({
        title: CSV_EXPORT_SUCCESS,
        text: createSuccessToastText(http),
        'data-test-subj': 'csvExportStarted',
      });
    } catch (error) {
      notifications.toasts.addDanger({
        title: CSV_EXPORT_ERROR,
        text: error?.body?.message || error?.message || 'Unknown error',
        'data-test-subj': 'csvExportFailed',
      });
    } finally {
      setIsExporting(false);
    }
  }, [http, ruleTypeIds, consumers, query, sort, columns, notifications, settings]);

  return (
    <EuiToolTip content={CSV_EXPORT_LABEL} disableScreenReaderOutput>
      <EuiButtonIcon
        color="text"
        iconType="exportAction"
        onClick={handleExport}
        isLoading={isExporting}
        aria-label={CSV_EXPORT_LABEL}
        data-test-subj="alerts-csv-export-button"
      />
    </EuiToolTip>
  );
};

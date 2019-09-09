/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Option, none } from 'fp-ts/lib/Option';
import { EuiPageContent, EuiText, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome, { Chrome } from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { listBreadcrumb } from '../../../lib/breadcrumbs';
import { SectionLoading } from '../../../components';
import { AlertingApi } from '../../../lib/api';

interface AlertsListProps {
  breadcrumbs: Chrome['breadcrumbs'];
  api: Option<AlertingApi>;
}

const SIXTY_SECONDS = 60 * 1000;

export const AlertsList = ({ breadcrumbs, api }: AlertsListProps) => {
  useEffect(() => {
    breadcrumbs.set([MANAGEMENT_BREADCRUMB, listBreadcrumb]);
  }, []);

  return api
    .mapNullable(alertingApi => {
      const { isLoading: isAlertsLoading, data: alerts } = alertingApi.loadAlerts(SIXTY_SECONDS);
      if (isAlertsLoading) {
        return <AlertsLoadingIndicator />;
      }
      // yuck! Should be cleaner with newer fp-ts, pull master
      return alerts.map(({ data }) => <AlertsTable alerts={data} />).getOrElse(<NoAlerts />);
    })
    .getOrElse(<NoAlerts />);
};

AlertsList.defaultProps = {
  breadcrumbs: chrome.breadcrumbs,
  api: none,
};

export const AlertsLoadingIndicator = () => (
  <SectionLoading>
    <FormattedMessage
      id="xpack.watcher.sections.alertsList.loadingAlertsDescription"
      defaultMessage="Loading alerts,,,"
    />
  </SectionLoading>
);

export const NoAlerts = () => {
  const alertingDescriptionText = (
    <FormattedMessage
      id="xpack.alerting.sections.alertsList.subhead"
      defaultMessage="Watch for changes or anomalies in your data and take action if needed."
    />
  );

  const emptyPromptBody = (
    <EuiText color="subdued">
      <p>{alertingDescriptionText}</p>
    </EuiText>
  );

  return (
    <EuiPageContent>
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.alerting.sections.alertsList.emptyPromptTitle"
              defaultMessage="You don’t have any alerts yet"
            />
          </h1>
        }
        body={emptyPromptBody}
        data-test-subj="emptyPrompt"
      />
    </EuiPageContent>
  );
};

export const AlertsTable = ({ alerts }: { alerts: any[] }) => {
  return (
    <ul>
      {alerts.map((alert, i) => (
        <li key={i}>{JSON.stringify(alerts)}</li>
      ))}
    </ul>
  );
};

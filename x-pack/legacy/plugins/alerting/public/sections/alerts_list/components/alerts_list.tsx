/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Option, option, none, some, getOrElse } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import {
  EuiText,
  EuiPageContent,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome, { Chrome } from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { i18n } from '@kbn/i18n';
import { listBreadcrumb } from '../../../lib/breadcrumbs';
import { flatMap } from '../../../lib/flat_map';
import { mapResult } from '../../../lib/result_type';
import { PageError, SectionLoading } from '../../../components';
import { PAGINATION } from '../../../constants';
import {
  AlertingApi,
  RequestData,
  LoadAlertsResponse,
  LoadAlertsErrorResponse,
  AlertResponse,
} from '../../../lib/api';

const map = option.map;

interface AlertsListProps {
  breadcrumbs: Chrome['breadcrumbs'];
  api: Option<AlertingApi>;
}

const SIXTY_SECONDS = 60 * 1000;

export const AlertsList = ({ breadcrumbs, api }: AlertsListProps) => {
  useEffect(() => {
    breadcrumbs.set([MANAGEMENT_BREADCRUMB, listBreadcrumb]);
  }, []);

  return pipe(
    api,
    flatMap(alertingApi =>
      mapResult<RequestData<LoadAlertsResponse>, LoadAlertsErrorResponse, Option<JSX.Element>>(
        alertingApi.loadAlerts(SIXTY_SECONDS),
        ({ isLoading: isAlertsLoading, data: alerts }) =>
          isAlertsLoading
            ? some(<AlertsLoadingIndicator />)
            : map(alerts, ({ data }) => (
                <ContentWrapper>
                  <AlertsTable alerts={data} />
                </ContentWrapper>
              )),
        error =>
          some(
            <EuiPageContent>
              <PageError errorCode={error} />
            </EuiPageContent>
          )
      )
    ),
    getOrElse(() => <NoAlerts />)
  );
};

AlertsList.defaultProps = {
  breadcrumbs: chrome.breadcrumbs,
  api: none,
};

export const AlertingDescriptionText = () => (
  <FormattedMessage
    id="xpack.alerting.sections.alertsList.subhead"
    defaultMessage="Watch for changes or anomalies in your data and take action if needed."
  />
);

export const AlertsLoadingIndicator = () => (
  <SectionLoading>
    <FormattedMessage
      id="xpack.alerting.sections.alertsList.loadingAlertsDescription"
      defaultMessage="Loading alerts…"
    />
  </SectionLoading>
);

export const NoAlerts = () => {
  const emptyPromptBody = (
    <EuiText color="subdued">
      <p>
        <AlertingDescriptionText />
      </p>
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

const alertsTableColumns = [
  {
    field: 'id',
    name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.idHeader', {
      defaultMessage: 'ID',
    }),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'alertTypeId',
    name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.alertTypeIdHeader', {
      defaultMessage: 'Alert Type ID',
    }),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'interval',
    name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.intervalHeader', {
      defaultMessage: 'Interval',
    }),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'createdBy',
    name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.createdByHeader', {
      defaultMessage: 'Created By',
    }),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'updatedBy',
    name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.updatedByHeader', {
      defaultMessage: 'Updated By',
    }),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'apiKeyOwner',
    name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.apiKeyOwnerHeader', {
      defaultMessage: 'Api Key Owner',
    }),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'scheduledTaskId',
    name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.scheduledTaskIdHeader', {
      defaultMessage: 'Scheduled Task Id',
    }),
    sortable: true,
    truncateText: true,
  },
];

export const AlertsTable = ({ alerts }: { alerts: AlertResponse[] }) => {
  return (
    <EuiInMemoryTable
      items={alerts}
      itemId="id"
      columns={alertsTableColumns}
      //   search={searchConfig}
      pagination={PAGINATION}
      sorting={true}
      //   selection={selectionConfig}
      isSelectable={true}
      message={
        <FormattedMessage
          id="xpack.alerting.sections.alertsList.alertTable.noAlertsMessage"
          defaultMessage="No Alerts to show"
        />
      }
      rowProps={() => ({
        'data-test-subj': 'row',
      })}
      cellProps={() => ({
        'data-test-subj': 'cell',
      })}
      data-test-subj="alertsTable"
    />
  );
};

export const ContentWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <EuiPageContent>
      <EuiTitle size="l">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <h1 data-test-subj="appTitle">
              <FormattedMessage
                id="xpack.alerting.sections.alertsList.header"
                defaultMessage="Alerting"
              />
            </h1>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiText color="subdued">
        <p>
          <AlertingDescriptionText />
        </p>
      </EuiText>

      <EuiSpacer size="xl" />

      {children}
    </EuiPageContent>
  );
};

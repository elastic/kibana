/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Option, option, some, getOrElse } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { EuiText, EuiPageContent, EuiEmptyPrompt, EuiInMemoryTable, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { flatMap } from '../../../lib/flat_map';
import { mapResult } from '../../../lib/result_type';
import { PageError } from '../../../components/page_error';
import {
  loadActionTypes,
  RequestData,
  LoadActionTypesResponse,
  LoadActionTypesErrorResponse,
  ActionTypesResponse,
} from '../../../lib/api';
import { ActionsContext } from '../../../context/app_context';

const map = option.map;

interface ActionsListProps {
  api: any;
}

export const ActionsList = ({ api }: ActionsListProps) => {
  const alertsTableColumns = [
    {
      field: 'id',
      name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.idHeader', {
        defaultMessage: 'Title',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'alertTypeId',
      name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.alertTypeIdHeader', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'interval',
      name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.intervalHeader', {
        defaultMessage: 'Details',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'createdBy',
      name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.createdByHeader', {
        defaultMessage: 'Last run',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'updatedBy',
      name: i18n.translate('xpack.alerting.sections.alertsList.alertTable.updatedByHeader', {
        defaultMessage: 'Notification',
      }),
      sortable: true,
      truncateText: true,
    },
  ];

  const ActionsTable = ({ actions }: { actions: ActionTypesResponse[] }) => {
    return (
      <EuiInMemoryTable
        items={actions}
        itemId="id"
        columns={alertsTableColumns}
        sorting={true}
        isSelectable={true}
        message={
          <FormattedMessage
            id="xpack.watcher.sections.watchList.watchTable.noWatchesMessage"
            defaultMessage="No actions to show"
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

  const ActionsLoadingIndicator = () => (
    <FormattedMessage
      id="xpack.alerting.sections.alertsList.loadingAlertsDescription"
      defaultMessage="Loading actions"
    />
  );

  return pipe(
    api,
    flatMap((alertingApi: any) =>
      mapResult<
        RequestData<LoadActionTypesResponse>,
        LoadActionTypesErrorResponse,
        Option<JSX.Element>
      >(
        loadActionTypes(alertingApi.api.http),
        ({ isLoading: isAlertsLoading, data: alerts }) =>
          isAlertsLoading
            ? some(<ActionsLoadingIndicator />)
            : map(alerts, (data: any) => (
                <ContentWrapper>
                  <EuiSpacer size="m" />
                  <ActionsTable actions={data} />
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

export const NoAlerts = () => {
  const emptyPromptBody = (
    <EuiText color="subdued">
      <p>ggjhgjh</p>
    </EuiText>
  );

  return (
    <EuiPageContent>
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.actions.sections.actoinsList.emptyPromptTitle"
              defaultMessage="You don’t have any actions yet"
            />
          </h1>
        }
        body={emptyPromptBody}
        data-test-subj="emptyPrompt"
      />
    </EuiPageContent>
  );
};

export const ContentWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <EuiPageContent>
      <EuiSpacer size="s" />
      <ActionsContext.Provider value={{}}>{children}</ActionsContext.Provider>
    </EuiPageContent>
  );
};

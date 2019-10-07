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
  const actionTypesTableColumns = [
    {
      field: 'id',
      name: i18n.translate('xpack.actions.sections.actionTypesList.actionTypesTable.idHeader', {
        defaultMessage: 'Id',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'name',
      name: i18n.translate(
        'xpack.actions.sections.actionTypesList.actionTypesTable.actionTypeHeader',
        {
          defaultMessage: 'Action Type',
        }
      ),
      sortable: true,
      truncateText: true,
    },
  ];

  const ActionTypesTable = ({ actionTypes }: { actionTypes: ActionTypesResponse[] }) => {
    return (
      <EuiInMemoryTable
        items={actionTypes}
        itemId="id"
        columns={actionTypesTableColumns}
        sorting={true}
        isSelectable={true}
        message={
          <FormattedMessage
            id="xpack.actions.sections.actionTypesList.actionTypesTable.noActionTypesMessage"
            defaultMessage="No action types to show"
          />
        }
        rowProps={() => ({
          'data-test-subj': 'row',
        })}
        cellProps={() => ({
          'data-test-subj': 'cell',
        })}
        data-test-subj="actionTypesTable"
      />
    );
  };

  const ActionTypesLoadingIndicator = () => (
    <FormattedMessage
      id="xpack.actions.sections.actionTypesList.loadingActionTypesDescription"
      defaultMessage="Loading action types"
    />
  );

  return pipe(
    api,
    flatMap((actionTypesApi: any) =>
      mapResult<
        RequestData<LoadActionTypesResponse>,
        LoadActionTypesErrorResponse,
        Option<JSX.Element>
      >(
        loadActionTypes(actionTypesApi.api.http),
        ({ isLoading: isActionTypesLoading, data: actionTypes }) =>
          isActionTypesLoading
            ? some(<ActionTypesLoadingIndicator />)
            : map(actionTypes, (data: any) => (
                <ContentWrapper>
                  <EuiSpacer size="m" />
                  <ActionTypesTable actionTypes={data} />
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
    getOrElse(() => <NoActionTypes />)
  );
};

export const NoActionTypes = () => {
  const emptyPromptBody = (
    <EuiText color="subdued">
      <p>No Action Types</p>
    </EuiText>
  );

  return (
    <EuiPageContent>
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.actions.sections.actoinsTypesList.emptyPromptTitle"
              defaultMessage="You don’t have any action types yet"
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

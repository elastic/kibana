/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiText, EuiPageContent, EuiEmptyPrompt, EuiInMemoryTable, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { PageError } from '../../../components/page_error';
import { loadActionTypes, ActionTypesResponse } from '../../../lib/api';
import { ActionsContext } from '../../../context/app_context';
import { useAppDependencies } from '../../../index';

interface ActionsListProps {
  api: any;
}

export const ActionsList: React.FunctionComponent<RouteComponentProps<ActionsListProps>> = ({
  match: {
    params: { api },
  },
  history,
}) => {
  const {
    core: { http },
  } = useAppDependencies();

  const { error, isLoading, data } = loadActionTypes(http);

  const actionTypesTableColumns = [
    {
      field: 'id',
      name: i18n.translate('xpack.alertingUI.sections.actionTypesList.actionTypesTable.idHeader', {
        defaultMessage: 'Id',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'name',
      name: i18n.translate(
        'xpack.alertingUI.sections.actionTypesList.actionTypesTable.actionTypeHeader',
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
            id="xpack.alertingUI.sections.actionTypesList.actionTypesTable.noActionTypesMessage"
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
      id="xpack.alertingUI.sections.actionTypesList.loadingActionTypesDescription"
      defaultMessage="Loading action types"
    />
  );

  let content;

  if (isLoading) {
    content = ActionTypesLoadingIndicator();
  } else if (error) {
    content = (
      <EuiPageContent>
        <PageError errorCode={error} />
      </EuiPageContent>
    );
  } else if (data.length === 0) {
    content = NoActionTypes();
  } else {
    content = (
      <Fragment>
        <ActionTypesTable actionTypes={data} />
      </Fragment>
    );
  }

  return (
    <section data-test-subj="actionTypesList">
      <ContentWrapper>
        <EuiSpacer size="m" />
        {content}
      </ContentWrapper>
    </section>
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
              id="xpack.alertingUI.sections.actoinsTypesList.emptyPromptTitle"
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

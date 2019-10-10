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
import { loadActions, ActionsResponse } from '../../../lib/api';
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

  const { error, isLoading, data: result } = loadActions(http);

  const actionsTableColumns = [
    {
      field: 'description',
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.descriptionHeader',
        {
          defaultMessage: 'Description',
        }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'actionTypeId',
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.actionTypeIdHeader',
        {
          defaultMessage: 'Action Type',
        }
      ),
      sortable: true,
      truncateText: true,
    },
  ];

  const ActionsTable = ({ actions }: { actions: ActionsResponse[] }) => {
    return (
      <EuiInMemoryTable
        items={actions}
        itemId="id"
        columns={actionsTableColumns}
        sorting={true}
        isSelectable={true}
        message={
          <FormattedMessage
            id="xpack.alertingUI.sections.actionsList.actionsListTable.noActionsMessage"
            defaultMessage="No actions to show"
          />
        }
        rowProps={() => ({
          'data-test-subj': 'row',
        })}
        cellProps={() => ({
          'data-test-subj': 'cell',
        })}
        data-test-subj="actionsTable"
      />
    );
  };

  const ActionsLoadingIndicator = () => (
    <FormattedMessage
      id="xpack.alertingUI.sections.actionsList.loadingActionsDescription"
      defaultMessage="Loading actions"
    />
  );

  let content;

  if (isLoading) {
    content = ActionsLoadingIndicator();
  } else if (error) {
    content = (
      <EuiPageContent>
        <PageError errorCode={error} />
      </EuiPageContent>
    );
  } else if (result.data.length === 0) {
    content = NoActions();
  } else {
    content = (
      <Fragment>
        <ActionsTable actions={result.data} />
      </Fragment>
    );
  }

  return (
    <section data-test-subj="actionsList">
      <ContentWrapper>
        <EuiSpacer size="m" />
        {content}
      </ContentWrapper>
    </section>
  );
};

export const NoActions = () => {
  const emptyPromptBody = (
    <EuiText color="subdued">
      <p>No Actions</p>
    </EuiText>
  );

  return (
    <EuiPageContent>
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.alertingUI.sections.actionsList.emptyPromptTitle"
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

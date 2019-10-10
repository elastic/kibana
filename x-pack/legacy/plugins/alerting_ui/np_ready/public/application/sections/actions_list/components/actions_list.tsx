/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiPageContent, EuiBasicTable, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PageError } from '../../../components/page_error';
import { loadActions } from '../../../lib/api';
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
    {
      field: 'config',
      name: i18n.translate('xpack.alertingUI.sections.actionsList.actionsListTable.configHeader', {
        defaultMessage: 'Config',
      }),
      sortable: false,
      truncateText: false,
    },
  ];

  let content;

  if (error) {
    content = (
      <EuiPageContent>
        <PageError errorCode={error} />
      </EuiPageContent>
    );
  } else {
    content = (
      <Fragment>
        <EuiBasicTable
          loading={isLoading}
          items={result ? result.data : []}
          itemId="id"
          columns={actionsTableColumns}
          rowProps={() => ({
            'data-test-subj': 'row',
          })}
          cellProps={() => ({
            'data-test-subj': 'cell',
          })}
          data-test-subj="actionsTable"
        />
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

export const ContentWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <EuiPageContent>
      <EuiSpacer size="s" />
      <ActionsContext.Provider value={{}}>{children}</ActionsContext.Provider>
    </EuiPageContent>
  );
};

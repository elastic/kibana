/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiPageContent, EuiBasicTable, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PageError } from '../../../components/page_error';
import { loadActions, Action } from '../../../lib/api';
import { ActionsContext } from '../../../context/app_context';
import { useAppDependencies } from '../../../index';

interface ActionsListProps {
  api: any;
}
interface Sorting {
  field: string;
  direction: 'asc' | 'desc';
}
interface Pagination {
  index: number;
  size: number;
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

  const [data, setData] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [totalItemCount, setTotalItemCount] = useState<number>(0);
  const [page, setPage] = useState<Pagination>({ index: 0, size: 10 });
  const [sort, setSort] = useState<Sorting>({ field: 'actionTypeId', direction: 'asc' });

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setErrorCode(null);
      try {
        const response = await loadActions({ http, sort, page });
        setData(response.data);
        setTotalItemCount(response.total);
      } catch (e) {
        setErrorCode(e.response.status);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sort, page]);

  const actionsTableColumns = [
    {
      field: 'description',
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.descriptionHeader',
        {
          defaultMessage: 'Description',
        }
      ),
      sortable: false,
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

  if (errorCode) {
    content = (
      <EuiPageContent>
        <PageError errorCode={errorCode} />
      </EuiPageContent>
    );
  } else {
    content = (
      <Fragment>
        <EuiBasicTable
          loading={isLoading}
          items={data}
          itemId="id"
          columns={actionsTableColumns}
          rowProps={() => ({
            'data-test-subj': 'row',
          })}
          cellProps={() => ({
            'data-test-subj': 'cell',
          })}
          data-test-subj="actionsTable"
          sorting={{ sort }}
          pagination={{
            pageIndex: page.index,
            pageSize: page.size,
            totalItemCount,
          }}
          onChange={({
            sort: changedSort,
            page: changedPage,
          }: {
            sort: Sorting;
            page: Pagination;
          }) => {
            setPage(changedPage);
            setSort(changedSort);
          }}
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

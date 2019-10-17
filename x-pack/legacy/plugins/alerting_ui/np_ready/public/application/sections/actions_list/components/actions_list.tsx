/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  EuiPageContent,
  EuiBasicTable,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PageError } from '../../../components/page_error';
import { Action, ActionType, loadActions, loadActionTypes } from '../../../lib/api';
import { ActionsContext } from '../../../context/app_context';
import { useAppDependencies } from '../../../index';
import { AlertingActionsDropdown } from './create_menu_popover';
import { ActionAdd } from '../../action_add';

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
interface Data extends Action {
  actionType: ActionType['name'];
}
type ActionTypeIndex = Record<string, ActionType>;

export const ActionsList: React.FunctionComponent<RouteComponentProps<ActionsListProps>> = ({
  match: {
    params: { api },
  },
  history,
}) => {
  const {
    core: { http },
  } = useAppDependencies();

  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex>({});
  const [data, setData] = useState<Data[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [totalItemCount, setTotalItemCount] = useState<number>(0);
  const [page, setPage] = useState<Pagination>({ index: 0, size: 10 });
  const [sort, setSort] = useState<Sorting>({ field: 'actionTypeId', direction: 'asc' });
  const [flyoutVisible, setFlyoutVisibility] = useState<boolean>(false);
  const [actionType, setActionTypeId] = useState<ActionType | null>(null);

  useEffect(() => {
    (async () => {
      const actionTypes = await loadActionTypes({ http });
      const index: ActionTypeIndex = {};
      for (const actionTypeItem of actionTypes) {
        index[actionTypeItem.id] = actionTypeItem;
      }
      setActionTypesIndex(index);
    })();
  }, []);

  useEffect(() => {
    const updatedData: Data[] = [];
    for (const action of data) {
      updatedData.push({
        ...action,
        actionType: actionTypesIndex[action.actionTypeId]
          ? actionTypesIndex[action.actionTypeId].name
          : action.actionTypeId,
      });
    }
    setData(updatedData);
  }, [actionTypesIndex]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setErrorCode(null);
      try {
        const actionsResponse = await loadActions({ http, sort, page });
        const updatedData = actionsResponse.data.map(
          (action: Action): Data => ({
            ...action,
            actionType: actionTypesIndex[action.actionTypeId]
              ? actionTypesIndex[action.actionTypeId].name
              : action.actionTypeId,
          })
        );
        setData(updatedData);
        setTotalItemCount(actionsResponse.total);
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
      field: 'actionType',
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.actionTypeHeader',
        {
          defaultMessage: 'Action Type',
        }
      ),
      sortable: false,
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

  function createAction(actionTypeItem: ActionType) {
    setFlyoutVisibility(true);
    setActionTypeId(actionTypeItem);
  }

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
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              placeholder="Search action"
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AlertingActionsDropdown
              actionTypes={actionTypesIndex}
              createAction={createAction}
            ></AlertingActionsDropdown>
          </EuiFlexItem>
        </EuiFlexGroup>

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

  let flyout = null;
  if (actionType) {
    flyout = <ActionAdd actionType={actionType} />;
  }

  return (
    <section data-test-subj="actionsList">
      <ContentWrapper
        setFlyoutVisibility={setFlyoutVisibility}
        flyoutVisible={flyoutVisible}
        createAction={createAction}
      >
        <EuiSpacer size="m" />
        {content}
        {flyout}
      </ContentWrapper>
    </section>
  );
};

export const ContentWrapper = ({
  flyoutVisible,
  setFlyoutVisibility,
  createAction,
  children,
}: {
  flyoutVisible: boolean;
  setFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  createAction: (actionType: ActionType) => void;
  children: React.ReactNode;
}) => {
  return (
    <EuiPageContent>
      <EuiSpacer size="s" />
      <ActionsContext.Provider value={{ flyoutVisible, setFlyoutVisibility }}>
        {children}
      </ActionsContext.Provider>
    </EuiPageContent>
  );
};

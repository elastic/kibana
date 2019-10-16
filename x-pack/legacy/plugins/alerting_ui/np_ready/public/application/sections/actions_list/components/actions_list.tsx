/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiPageContent, EuiBasicTable, EuiSpacer, EuiSearchBar, EuiButton } from '@elastic/eui';
import { capabilities } from 'ui/capabilities';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { PageError } from '../../../components/page_error';
import { Action, ActionType, deleteActions, loadActions, loadActionTypes } from '../../../lib/api';
import { ActionsContext } from '../../../context/app_context';
import { useAppDependencies } from '../../../index';
import { AlertingActionsDropdown } from './create_menu_popover';

type ActionTypeIndex = Record<string, ActionType>;
interface ActionsListProps {
  api: any;
}
interface Pagination {
  index: number;
  size: number;
}
interface Data extends Action {
  actionType: ActionType['name'];
}

const canDelete = capabilities.get().actions.delete;
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

export const ActionsList: React.FunctionComponent<RouteComponentProps<ActionsListProps>> = ({
  match: {
    params: { api },
  },
  history,
}) => {
  const {
    core: { http },
  } = useAppDependencies();

  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  const [actions, setActions] = useState<Action[]>([]);
  const [data, setData] = useState<Data[]>([]);
  const [selectedItems, setSelectedItems] = useState<Data[]>([]);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);
  const [isLoadingActions, setIsLoadingActions] = useState<boolean>(false);
  const [isDeletingActions, setIsDeletingActions] = useState<boolean>(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [totalItemCount, setTotalItemCount] = useState<number>(0);
  const [page, setPage] = useState<Pagination>({ index: 0, size: 10 });
  const [searchText, setSearchText] = useState<string | undefined>(undefined);

  async function loadActionsTable() {
    setIsLoadingActions(true);
    setErrorCode(null);
    try {
      const actionsResponse = await loadActions({ http, page, searchText });
      setActions(actionsResponse.data);
      setTotalItemCount(actionsResponse.total);
    } catch (e) {
      setErrorCode(e.response.status);
    } finally {
      setIsLoadingActions(false);
    }
  }

  useEffect(() => {
    loadActionsTable();
  }, [page, searchText]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingActionTypes(true);
        const actionTypes = await loadActionTypes({ http });
        const index: ActionTypeIndex = {};
        for (const actionType of actionTypes) {
          index[actionType.id] = actionType;
        }
        setActionTypesIndex(index);
      } catch (e) {
        setErrorCode(e.response.status);
      } finally {
        setIsLoadingActionTypes(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Avoid flickering before action types load
    if (typeof actionTypesIndex === 'undefined') {
      return;
    }
    const updatedData = actions.map(action => {
      return {
        ...action,
        actionType: actionTypesIndex[action.actionTypeId]
          ? actionTypesIndex[action.actionTypeId].name
          : action.actionTypeId,
      };
    });
    setData(updatedData);
  }, [actions, actionTypesIndex]);

  async function deleteSelectedItems() {
    setIsDeletingActions(true);
    await deleteActions({ http, ids: selectedItems.map(item => item.id) });
    await loadActionsTable();
    setIsDeletingActions(false);
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
        <EuiSearchBar
          onChange={({ queryText }: { queryText: string }) => setSearchText(queryText)}
          filters={[
            {
              type: 'field_value_selection',
              field: 'type',
              name: i18n.translate(
                'xpack.alertingUI.sections.actionsList.actionsListTable.typeFilterName',
                { defaultMessage: 'Type' }
              ),
              multiSelect: 'or',
              options: Object.values(actionTypesIndex || {}).map(actionType => ({
                value: actionType.id,
                name: actionType.name,
              })),
            },
          ]}
          toolsRight={[
            <EuiButton
              key="delete"
              iconType="trash"
              color="danger"
              isDisabled={selectedItems.length === 0 || !canDelete}
              onClick={deleteSelectedItems}
              title={
                canDelete
                  ? undefined
                  : i18n.translate(
                      'xpack.alertingUI.sections.actionsList.actionsListTable.deleteButtonTitle',
                      { defaultMessage: 'Unable to delete saved objects' }
                    )
              }
            >
              <FormattedMessage
                id="xpack.alertingUI.sections.actionsList.actionsListTable.deleteButtonLabel"
                defaultMessage="Delete"
              />
            </EuiButton>,
            <AlertingActionsDropdown
              key="create-action"
              actionTypes={actionTypesIndex}
            ></AlertingActionsDropdown>,
          ]}
        ></EuiSearchBar>

        <EuiSpacer size="s" />

        <EuiBasicTable
          loading={isLoadingActions || isLoadingActionTypes || isDeletingActions}
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
          pagination={{
            pageIndex: page.index,
            pageSize: page.size,
            totalItemCount,
          }}
          onChange={({ page: changedPage }: { page: Pagination }) => {
            setPage(changedPage);
          }}
          selection={{
            onSelectionChange(updatedSelectedItemsList: Data[]) {
              setSelectedItems(updatedSelectedItemsList);
            },
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
    <Fragment>
      <EuiSpacer size="s" />
      <ActionsContext.Provider value={{}}>{children}</ActionsContext.Provider>
    </Fragment>
  );
};

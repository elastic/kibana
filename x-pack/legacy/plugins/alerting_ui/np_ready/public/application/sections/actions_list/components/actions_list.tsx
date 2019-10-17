/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
// @ts-ignore: EuiSearchBar not defined in TypeScript yet
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
interface Pagination {
  index: number;
  size: number;
}
interface Data extends Action {
  actionType: ActionType['name'];
}

const canDelete = capabilities.get().actions.delete;

export const ActionsList: React.FunctionComponent = () => {
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

  async function deleteItems(items: Data[]) {
    setIsDeletingActions(true);
    await deleteActions({ http, ids: items.map(item => item.id) });
    await loadActionsTable();
    setIsDeletingActions(false);
  }

  async function deleteSelectedItems() {
    await deleteItems(selectedItems);
  }

  const actionsTableColumns = [
    {
      field: 'description',
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.columns.description',
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
        'xpack.alertingUI.sections.actionsList.actionsListTable.columns.actionType',
        {
          defaultMessage: 'Action Type',
        }
      ),
      sortable: false,
      truncateText: true,
    },
    {
      field: 'config',
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.columns.config',
        { defaultMessage: 'Config' }
      ),
      sortable: false,
      truncateText: false,
    },
    {
      name: i18n.translate(
        'xpack.alertingUI.sections.actionsList.actionsListTable.columns.actions',
        { defaultMessage: 'Actions' }
      ),
      actions: [
        {
          enabled: () => canDelete,
          name: i18n.translate(
            'xpack.alertingUI.sections.actionsList.actionsListTable.columns.actions.deleteActionName',
            { defaultMessage: 'Delete' }
          ),
          description: canDelete
            ? i18n.translate(
                'xpack.alertingUI.sections.actionsList.actionsListTable.columns.actions.deleteActionDescription',
                { defaultMessage: 'Delete this action' }
              )
            : i18n.translate(
                'xpack.alertingUI.sections.actionsList.actionsListTable.columns.actions.deleteActionDisabledDescription',
                { defaultMessage: 'Unable to delete actions' }
              ),
          type: 'icon',
          icon: 'trash',
          onClick: (item: Data) => deleteItems([item]),
        },
      ],
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
        <EuiSearchBar
          onChange={({ queryText }: { queryText: string }) => setSearchText(queryText)}
          filters={[
            {
              type: 'field_value_selection',
              field: 'type',
              name: i18n.translate('xpack.alertingUI.sections.actionsList.filters.typeName', {
                defaultMessage: 'Type',
              }),
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
                      'xpack.alertingUI.sections.actionsList.buttons.deleteDisabledTitle',
                      { defaultMessage: 'Unable to delete actions' }
                    )
              }
            >
              <FormattedMessage
                id="xpack.alertingUI.sections.actionsList.buttons.deleteLabel"
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

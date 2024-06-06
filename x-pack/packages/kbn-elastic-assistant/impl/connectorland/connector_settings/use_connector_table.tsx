/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSearchBarProps,
} from '@elastic/eui';
import React, { useState, useMemo } from 'react';
import { ActionType, ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { getConnectorCompatibility } from '@kbn/actions-plugin/common';
import { RowActions } from '../../assistant/common/components/row_actions';
import { AIConnector } from '../connector_selector';
import { getActionTypeTitle, getGenAiConfig } from '../helpers';
import {
  CONNECTORS_TABLE_COLUMN_ACTIONS,
  CONNECTORS_TABLE_COLUMN_ACTION_TYPE,
  CONNECTORS_TABLE_COLUMN_COMPATIBILITY,
  CONNECTORS_TABLE_COLUMN_NAME,
  CREATE_CONNECTOR_BUTTON,
  PRECONFIGURED_CONNECTOR,
  REFRESH_CONNECTORS_BUTTON,
  SEARCH_CONNECTOR_PLACEHOLDER,
} from '../translations';
import { ActionConnectorTableItem } from './types';

interface Props {
  actionTypes: ActionType[] | undefined;
  actionTypeRegistry: ActionTypeRegistryContract;
  aiConnectors: AIConnector[] | undefined;
  areConnectorsFetched: boolean;
  hasConnectorsAllPrivilege: boolean;
  refetchConnectors: () => void;
  handleAddConnector: () => void;
  onEditConnector: (connector: ActionConnectorTableItem) => void;
  onDeleteConnector: (connector: ActionConnectorTableItem) => void;
}
export const useConnectorTable = ({
  actionTypes,
  actionTypeRegistry,
  aiConnectors,
  areConnectorsFetched,
  hasConnectorsAllPrivilege,
  refetchConnectors,
  handleAddConnector,
  onEditConnector,
  onDeleteConnector,
}: Props) => {
  const [query, setQuery] = useState('');

  const handleOnChange: EuiSearchBarProps['onChange'] = ({ queryText, error }) => {
    if (!error) {
      setQuery(queryText);
    }
  };

  const search: EuiSearchBarProps = useMemo(
    () => ({
      query,
      onChange: handleOnChange,
      box: {
        schema: true,
        placeholder: SEARCH_CONNECTOR_PLACEHOLDER,
      },
      toolsRight: [
        <EuiButton
          key="refetch"
          iconType="refresh"
          isDisabled={!areConnectorsFetched}
          onClick={refetchConnectors}
        >
          {REFRESH_CONNECTORS_BUTTON}
        </EuiButton>,
        <EuiButton
          key="create"
          iconType="plusInCircle"
          isDisabled={!hasConnectorsAllPrivilege && !areConnectorsFetched}
          onClick={handleAddConnector}
        >
          {CREATE_CONNECTOR_BUTTON}
        </EuiButton>,
      ],
    }),
    [areConnectorsFetched, hasConnectorsAllPrivilege, handleAddConnector, refetchConnectors, query]
  );

  const columns: Array<EuiBasicTableColumn<ActionConnectorTableItem>> = useMemo(
    () => [
      {
        name: CONNECTORS_TABLE_COLUMN_NAME,
        truncateText: false,
        mobileOptions: {
          show: true,
        },
        render: (connector: ActionConnectorTableItem) => (
          <EuiLink onClick={() => onEditConnector(connector)}>{connector.name}</EuiLink>
        ),
      },
      {
        field: 'actionType',
        name: CONNECTORS_TABLE_COLUMN_ACTION_TYPE,
        truncateText: false,
        mobileOptions: {
          show: true,
        },
        render: (actionType: ActionConnectorTableItem['actionType']) =>
          actionType ? <EuiBadge color="hollow">{actionType}</EuiBadge> : null,
      },
      {
        name: CONNECTORS_TABLE_COLUMN_COMPATIBILITY,
        truncateText: true,
        mobileOptions: {
          show: true,
        },
        render: (tableItem: ActionConnectorTableItem) => {
          return (
            <EuiFlexGroup
              wrap
              responsive={false}
              gutterSize="xs"
              data-test-subj="compatibility-content"
            >
              {tableItem?.compatibility?.map((compatibilityItem: string) => (
                <EuiFlexItem grow={false} key={`${tableItem.id}-${compatibilityItem}`}>
                  <EuiBadge
                    data-test-subj="connectorsTableCell-compatibility-badge"
                    color="default"
                  >
                    {compatibilityItem}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          );
        },
      },
      {
        name: CONNECTORS_TABLE_COLUMN_ACTIONS,
        actions: [
          {
            name: CONNECTORS_TABLE_COLUMN_ACTIONS,
            render: (connector: ActionConnectorTableItem) => {
              return (
                <RowActions<ActionConnectorTableItem>
                  rowItem={connector}
                  onEdit={onEditConnector}
                  onDelete={onDeleteConnector}
                />
              );
            },
          },
        ],
      },
    ],
    [onDeleteConnector, onEditConnector]
  );

  const aiConnectorTableItems: ActionConnectorTableItem[] | undefined = areConnectorsFetched
    ? (aiConnectors ?? []).map((connector) => {
        const currentActionType = actionTypes?.find(
          (actionType) => actionType.id === connector.actionTypeId
        );

        const connectorTypeTitle =
          getGenAiConfig(connector)?.apiProvider ??
          getActionTypeTitle(actionTypeRegistry.get(connector.actionTypeId));
        const actionType = connector.isPreconfigured ? PRECONFIGURED_CONNECTOR : connectorTypeTitle;
        return {
          ...connector,
          actionType,
          compatibility: currentActionType
            ? getConnectorCompatibility(currentActionType.supportedFeatureIds)
            : [],
        };
      })
    : undefined;

  return { search, columns, aiConnectorTableItems };
};

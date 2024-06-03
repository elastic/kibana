/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiInMemoryTable,
  EuiSearchBarProps,
  EuiSkeletonText,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useAssistantContext } from '../../assistant_context';
import { AIConnector } from '../connector_selector';
import { useLoadConnectors } from '../use_load_connectors';
import {
  CREATE_CONNECTOR_BUTTON,
  MISSING_READ_CONNECTORS_CALLOUT_TITLE,
  REFRESH_CONNECTORS_BUTTON,
} from '../translations';
import { ConnectorRowActions } from './connector_row_actions';

export interface Props {}

const emptyConnectors = [] as AIConnector[];

const ConnectorsSettingsComponent: React.FC<Props> = () => {
  const { http, assistantAvailability, getEditConnectorFlyout } = useAssistantContext();
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);

  const onCloseEditFlyout = useCallback(() => {
    setEditFlyoutVisibility(false);
  }, []);
  const [editedConnectorItem, setEditedConnectorItem] = useState<AIConnector | null>(null);

  const {
    data: aiConnectors,
    refetch: refetchConnectors,
    isFetchedAfterMount: areConnectorsFetched,
  } = useLoadConnectors({ http });

  const [query, setQuery] = useState('');

  const handleOnChange: EuiSearchBarProps['onChange'] = ({ queryText, error }) => {
    if (!error) {
      setQuery(queryText);
    }
  };

  const handleRefetchConnectors = useCallback(() => {
    refetchConnectors();
  }, [refetchConnectors]);

  const onClickEditConnector = useCallback((connector: AIConnector) => {
    setEditedConnectorItem(connector);
    setEditFlyoutVisibility(true);
  }, []);

  const columns = [
    {
      name: 'Connector name',
      truncateText: false,
      mobileOptions: {
        show: true,
      },
      render: (connector: AIConnector) => (
        <EuiButtonEmpty onClick={() => onClickEditConnector(connector)}>
          {connector.name}
        </EuiButtonEmpty>
      ),
    },
    {
      field: 'apiProvider',
      name: 'Type',
      truncateText: false,
      mobileOptions: {
        show: true,
      },
      render: (apiProvider: AIConnector['apiProvider']) => (
        <EuiBadge color="hollow">{apiProvider}</EuiBadge>
      ),
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Action',
          icon: 'boxesHorizontal',
          render: (connector: AIConnector) => {
            return (
              <ConnectorRowActions
                connector={connector}
                onClickEditConnector={onClickEditConnector}
              />
            );
          },
        },
      ],
    },
  ];

  const search: EuiSearchBarProps = {
    query,
    onChange: handleOnChange,
    box: {
      schema: true,
      placeholder: 'Search for connectors',
    },
    toolsRight: [
      <EuiButton
        key="refetchConnector"
        iconType="refresh"
        isDisabled={!areConnectorsFetched}
        onClick={handleRefetchConnectors}
      >
        {REFRESH_CONNECTORS_BUTTON}
      </EuiButton>,
      <EuiButton key="createConnector" iconType="plusInCircle" isDisabled={!areConnectorsFetched}>
        {CREATE_CONNECTOR_BUTTON}
      </EuiButton>,
    ],
  };

  const onConnectorUpdated = useCallback(
    async (updatedConnector) => {
      setEditedConnectorItem(updatedConnector);
      refetchConnectors();
    },
    [refetchConnectors, setEditedConnectorItem]
  );

  const ConnectorEditFlyout = useMemo(
    () =>
      editedConnectorItem && editFlyoutVisible
        ? getEditConnectorFlyout({
            connector: editedConnectorItem,
            onClose: onCloseEditFlyout,
            onConnectorUpdated,
          })
        : null,
    [
      editFlyoutVisible,
      editedConnectorItem,
      getEditConnectorFlyout,
      onCloseEditFlyout,
      onConnectorUpdated,
    ]
  );

  if (!assistantAvailability.hasConnectorsReadPrivilege) {
    return (
      <EuiCallOut
        data-test-subj="connectorMissingCallout"
        color="danger"
        iconType="controlsVertical"
        size="m"
        title={MISSING_READ_CONNECTORS_CALLOUT_TITLE}
      />
    );
  }

  return areConnectorsFetched ? (
    <>
      <EuiInMemoryTable
        items={aiConnectors ?? emptyConnectors}
        columns={columns}
        pagination={true}
        search={search}
      />
      {ConnectorEditFlyout}
    </>
  ) : (
    <EuiSkeletonText lines={5} />
  );
};

export const ConnectorsSettings = React.memo(ConnectorsSettingsComponent);

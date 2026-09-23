/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSelectable,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { ContextEngineConnectorFeatureId } from '@kbn/actions-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { useQueryClient } from '@kbn/react-query';
import { noop } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import type { DataConnector } from '../../hooks/use_data_connectors';
import { contextEngineQueryKeys } from '../../hooks/query_keys';
import { ConnectorTypeIcon } from '../connector_type_icon';

interface ConnectorsTabProps {
  connectors: DataConnector[];
  isLoading: boolean;
  isError: boolean;
  selectedConnectorIds: string[];
  onToggle: (params: { id: string; name: string; checked: boolean }) => void;
}

interface ConnectorsTabContentProps {
  connectors: DataConnector[];
  isLoading: boolean;
  isError: boolean;
  options: EuiSelectableOption[];
  onConnectorSelectionChange: (
    _options: EuiSelectableOption[],
    _event: unknown,
    changedOption: EuiSelectableOption
  ) => void;
  createConnectorButton: React.ReactNode;
  canCreateConnector: boolean;
}

const ConnectorsTabContent = ({
  connectors,
  isLoading,
  isError,
  options,
  onConnectorSelectionChange,
  createConnectorButton,
  canCreateConnector,
}: ConnectorsTabContentProps) => {
  if (isLoading) {
    return <EuiSkeletonText lines={3} data-test-subj="contextConnectorsLoading" />;
  }

  if (isError) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        data-test-subj="contextConnectorsError"
        title={
          <h3>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.connectors.errorTitle"
              defaultMessage="Unable to load connectors"
            />
          </h3>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.connectors.errorBody"
              defaultMessage="Connectors could not be loaded. Try again or check your permissions."
            />
          </p>
        }
      />
    );
  }

  if (connectors.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="plugs"
        titleSize="xs"
        data-test-subj="contextConnectorsEmpty"
        title={
          <h3>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.connectors.emptyTitle"
              defaultMessage="No connectors yet"
            />
          </h3>
        }
        body={
          <p>
            {canCreateConnector ? (
              <FormattedMessage
                id="xpack.contextEngine.sourcePicker.connectors.emptyBody"
                defaultMessage="Create a connector to use it as a source."
              />
            ) : (
              <FormattedMessage
                id="xpack.contextEngine.sourcePicker.connectors.emptyBodyNoAccess"
                defaultMessage="Ask your administrator to create a connector."
              />
            )}
          </p>
        }
        actions={createConnectorButton}
      />
    );
  }

  return (
    <div data-test-subj="contextConnectorsTab">
      <EuiSelectable
        aria-label={i18n.translate('xpack.contextEngine.sourcePicker.connectors.listAriaLabel', {
          defaultMessage: 'Select connectors to use as sources',
        })}
        searchable
        options={options}
        onChange={onConnectorSelectionChange}
        height={240}
        listProps={{ bordered: true, onFocusBadge: false }}
        data-test-subj="contextConnectorsSelectable"
      >
        {(list, search) => (
          <>
            {search}
            <EuiSpacer size="s" />
            {list}
          </>
        )}
      </EuiSelectable>
      {createConnectorButton && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
            <EuiFlexItem grow={false}>{createConnectorButton}</EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
};

export const ConnectorsTab = ({
  connectors,
  isLoading,
  isError,
  selectedConnectorIds,
  onToggle,
}: ConnectorsTabProps) => {
  const [isCreateFlyoutOpen, { on: openCreateFlyout, off: closeCreateFlyout }] = useBoolean(false);
  const queryClient = useQueryClient();
  const {
    services: { application, triggersActionsUi },
  } = useKibana();

  const canCreateConnector = application?.capabilities.actions?.save === true;

  const selectedIds = useMemo(() => new Set(selectedConnectorIds), [selectedConnectorIds]);

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      connectors.map((connector) => ({
        key: connector.id,
        label: connector.name,
        checked: selectedIds.has(connector.id) ? 'on' : undefined,
        prepend: <ConnectorTypeIcon actionTypeId={connector.actionTypeId} />,
        'data-test-subj': `contextConnectorOption-${connector.id}`,
      })),
    [connectors, selectedIds]
  );

  const handleConnectorSelectionChange = (
    _options: EuiSelectableOption[],
    _event: unknown,
    changedOption: EuiSelectableOption
  ) => {
    if (!changedOption.key) {
      return;
    }
    onToggle({
      id: changedOption.key,
      name: changedOption.label,
      checked: changedOption.checked === 'on',
    });
  };

  const invalidateConnectorQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.connectors.list() });
  }, [queryClient]);

  const handleConnectorCreated = useCallback(
    (connector: ActionConnector) => {
      invalidateConnectorQueries();
      onToggle({ id: connector.id, name: connector.name, checked: true });
    },
    [invalidateConnectorQueries, onToggle]
  );

  const handleCloseCreateFlyout = useCallback(() => {
    invalidateConnectorQueries();
    closeCreateFlyout();
  }, [closeCreateFlyout, invalidateConnectorQueries]);

  const createConnectorFlyout = useMemo(
    () =>
      isCreateFlyoutOpen
        ? triggersActionsUi.getAddConnectorFlyout({
            featureId: ContextEngineConnectorFeatureId,
            size: 'm',
            onClose: handleCloseCreateFlyout,
            onConnectorCreated: handleConnectorCreated,
            onTestConnector: noop, // Required by CreateConnectorFlyout to render Save & test
          })
        : null,
    [handleCloseCreateFlyout, handleConnectorCreated, isCreateFlyoutOpen, triggersActionsUi]
  );

  const createConnectorButton = canCreateConnector ? (
    <EuiButtonEmpty
      iconType="plusCircle"
      onClick={openCreateFlyout}
      data-test-subj="contextCreateConnectorButton"
    >
      <FormattedMessage
        id="xpack.contextEngine.sourcePicker.connectors.createButton"
        defaultMessage="Create connector"
      />
    </EuiButtonEmpty>
  ) : null;

  return (
    <>
      <ConnectorsTabContent
        connectors={connectors}
        isLoading={isLoading}
        isError={isError}
        options={options}
        onConnectorSelectionChange={handleConnectorSelectionChange}
        createConnectorButton={createConnectorButton}
        canCreateConnector={canCreateConnector}
      />
      {createConnectorFlyout}
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { ContextEngineConnectorFeatureId } from '@kbn/actions-plugin/common';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { useQueryClient } from '@kbn/react-query';
import { noop } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { contextEngineQueryKeys } from '../../hooks/query_keys';
import { useCanReadConnectors } from '../../hooks/use_can_read_connectors';
import { useDataConnectors } from '../../hooks/use_data_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { AiIndexDetailPanelEmptyState } from '../ai_index_detail/ai_index_detail_panel_empty_prompt';
interface ConnectorsTabProps {
  selectedConnectorIds: string[];
  onToggle: (params: { id: string; name: string; checked: boolean }) => void;
}

interface ConnectorsTabContentProps {
  isError: boolean;
  showEmptyPrompt: boolean;
  connectorOptions: EuiComboBoxOptionOption<string>[];
  isComboLoading: boolean;
  onSearchChange: (search: string) => void;
  onConnectorPicked: (nextSelectedOptions: EuiComboBoxOptionOption<string>[]) => void;
  onComboFocus: () => void;
  createConnectorButton: React.ReactNode;
  canCreateConnector: boolean;
  canReadConnectors: boolean;
}

const ConnectorsTabContent = ({
  isError,
  showEmptyPrompt,
  connectorOptions,
  isComboLoading,
  onSearchChange,
  onConnectorPicked,
  onComboFocus,
  createConnectorButton,
  canCreateConnector,
  canReadConnectors,
}: ConnectorsTabContentProps) => {
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

  return (
    <div data-test-subj="contextConnectorsTab">
      {!canReadConnectors && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            title={i18n.translate(
              'xpack.contextEngine.sourcePicker.connectors.missingReadPrivilege',
              {
                defaultMessage:
                  'You need Actions and Connectors read access to search and select connectors.',
              }
            )}
            data-test-subj="contextConnectorsMissingReadPrivilegeCallout"
          />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.connectors.fieldLabel"
            defaultMessage="Connector"
          />
        }
        helpText={
          canReadConnectors ? (
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.connectors.fieldHelp"
              defaultMessage="Start typing to search, then select a connector from the list."
            />
          ) : undefined
        }
      >
        <EuiComboBox
          fullWidth
          singleSelection={{ asPlainText: true }}
          sortMatchesBy="startsWith"
          selectedOptions={[]}
          isClearable={false}
          isDisabled={!canReadConnectors}
          noSuggestions={showEmptyPrompt}
          aria-label={i18n.translate('xpack.contextEngine.sourcePicker.connectors.comboAriaLabel', {
            defaultMessage: 'Select a connector',
          })}
          placeholder={i18n.translate(
            'xpack.contextEngine.sourcePicker.connectors.comboPlaceholder',
            {
              defaultMessage: 'e.g. Google Drive or GitHub',
            }
          )}
          options={connectorOptions}
          onChange={onConnectorPicked}
          onSearchChange={onSearchChange}
          onFocus={onComboFocus}
          isLoading={isComboLoading}
          data-test-subj="contextConnectorComboBox"
        />
      </EuiFormRow>
      {createConnectorButton && (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
          <EuiFlexItem grow={false}>{createConnectorButton}</EuiFlexItem>
        </EuiFlexGroup>
      )}
      {canReadConnectors && showEmptyPrompt && (
        <AiIndexDetailPanelEmptyState
          paddingSize="none"
          iconType="plugs"
          dataTestSubj="contextConnectorsEmpty"
          message={
            canCreateConnector ? (
              <FormattedMessage
                id="xpack.contextEngine.sourcePicker.connectors.emptyBody"
                defaultMessage="No connectors yet. Create one to use it as a source."
              />
            ) : (
              <FormattedMessage
                id="xpack.contextEngine.sourcePicker.connectors.emptyBodyNoAccess"
                defaultMessage="No connectors yet. Ask your administrator to create one."
              />
            )
          }
        />
      )}
    </div>
  );
};

export const ConnectorsTab = ({ selectedConnectorIds, onToggle }: ConnectorsTabProps) => {
  const [isCreateFlyoutOpen, { on: openCreateFlyout, off: closeCreateFlyout }] = useBoolean(false);
  const [searchValue, setSearchValue] = useState('');
  const [hasFocused, setHasFocused] = useState(false);
  const queryClient = useQueryClient();
  const {
    services: { application, triggersActionsUi },
  } = useKibana();

  const canCreateConnector = application?.capabilities.actions?.save === true;
  const canReadConnectors = useCanReadConnectors();

  const shouldLoadConnectors = hasFocused || searchValue.trim().length > 0;

  const { connectors, isLoading, isError } = useDataConnectors({
    enabled: shouldLoadConnectors && canReadConnectors,
  });

  const handleSearchChange = useCallback((search: string) => {
    setSearchValue(search);
    setHasFocused(true);
  }, []);

  const selectedIds = useMemo(() => new Set(selectedConnectorIds), [selectedConnectorIds]);

  const connectorOptions = useMemo<EuiComboBoxOptionOption<string>[]>(
    () =>
      connectors
        .filter((connector) => !selectedIds.has(connector.id))
        .map((connector) => ({
          label: connector.name,
          value: connector.id,
          'data-test-subj': `contextConnectorOption-${connector.id}`,
          ...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexEditFlyoutSourcePicker,
            action: CONTEXT_ENGINE_UI_EBT.action.sources.TOGGLE_CONNECTOR,
            detail: connector.actionTypeId,
          }),
        })),
    [connectors, selectedIds]
  );

  const showEmptyPrompt =
    canReadConnectors &&
    shouldLoadConnectors &&
    !isLoading &&
    !isError &&
    searchValue.trim() === '' &&
    connectorOptions.length === 0 &&
    selectedConnectorIds.length === 0;

  const handleConnectorPicked = useCallback(
    (nextSelectedOptions: EuiComboBoxOptionOption<string>[]) => {
      const pickedId = nextSelectedOptions[0]?.value;
      if (!pickedId) {
        return;
      }
      const connector = connectors.find((entry) => entry.id === pickedId);
      if (!connector) {
        return;
      }
      onToggle({ id: connector.id, name: connector.name, checked: true });
      setSearchValue('');
    },
    [connectors, onToggle]
  );

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

  const createConnectorButton =
    canCreateConnector && canReadConnectors ? (
      <EuiButtonEmpty
        iconType="plusCircle"
        onClick={openCreateFlyout}
        data-test-subj="contextCreateConnectorButton"
        {...getEbtProps({
          element: CONTEXT_ENGINE_UI_EBT.element.aiIndexEditFlyoutSourcePicker,
          action: CONTEXT_ENGINE_UI_EBT.action.sources.CREATE_CONNECTOR,
        })}
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
        isError={isError}
        showEmptyPrompt={showEmptyPrompt}
        connectorOptions={connectorOptions}
        isComboLoading={isLoading && shouldLoadConnectors && connectorOptions.length === 0}
        onSearchChange={handleSearchChange}
        onConnectorPicked={handleConnectorPicked}
        onComboFocus={() => setHasFocused(true)}
        createConnectorButton={createConnectorButton}
        canCreateConnector={canCreateConnector}
        canReadConnectors={canReadConnectors}
      />
      {createConnectorFlyout}
    </>
  );
};

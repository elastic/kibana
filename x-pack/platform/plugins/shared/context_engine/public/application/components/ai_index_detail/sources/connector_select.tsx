/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import { useDataConnectors } from '../../../hooks/use_data_connectors';
import { AddSourceCard } from './add_source_card';
import { SelectableConnectorCard } from './connector_card';
import { AiIndexDetailPanelEmptyState } from '../ai_index_detail_panel_empty_prompt';
import { getSourceDisplay } from './source_display';

interface ConnectorSelectProps {
  selectedConnectorIds: string[];
  savedConnectorIds: string[];
  onToggle: (params: { id: string; name: string; checked: boolean }) => void;
  onOpenCreateConnector: () => void;
  canCreateConnector: boolean;
  canReadConnectors: boolean;
  disabled?: boolean;
}

export const ConnectorSelect = ({
  selectedConnectorIds,
  savedConnectorIds,
  onToggle,
  disabled = false,
  onOpenCreateConnector,
  canCreateConnector,
  canReadConnectors,
}: ConnectorSelectProps) => {
  const {
    connectors,
    connectorNameById,
    connectorActionTypeById,
    connectorTypeNameById,
    isLoading,
    isError,
  } = useDataConnectors({ enabled: canReadConnectors });

  const selectedIds = useMemo(() => new Set(selectedConnectorIds), [selectedConnectorIds]);
  const availableConnectors = useMemo(() => {
    const savedIds = new Set(savedConnectorIds);
    return connectors.filter((connector) => !savedIds.has(connector.id));
  }, [connectors, savedConnectorIds]);

  const showCreateActions = canCreateConnector && canReadConnectors;

  const showEmptyPrompt =
    canReadConnectors &&
    !isLoading &&
    !isError &&
    availableConnectors.length === 0 &&
    !showCreateActions;

  const createCardEbtProps = getEbtProps({
    element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
    action: CONTEXT_ENGINE_UI_EBT.action.sources.CREATE_CONNECTOR,
  });

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
      {canReadConnectors && (
        <>
          <EuiText size="xs">
            <p>
              <strong>
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.installedConnectorsLabel"
                  defaultMessage="Installed connectors"
                />
              </strong>
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          {isLoading ? (
            <EuiSkeletonText lines={3} data-test-subj="contextConnectorsLoading" />
          ) : (
            <>
              <EuiFlexGrid columns={3} gutterSize="m">
                {availableConnectors.map((connector) => {
                  const { icon, label, typeLabel } = getSourceDisplay('connector', connector.id, {
                    connectorNameById,
                    connectorActionTypeById,
                    connectorTypeNameById,
                  });

                  return (
                    <EuiFlexItem key={connector.id}>
                      <SelectableConnectorCard
                        id={`contextConnectorCheckbox-${connector.id}`}
                        icon={icon}
                        name={label}
                        typeLabel={typeLabel}
                        isChecked={selectedIds.has(connector.id)}
                        isDisabled={disabled}
                        onChange={(checked) =>
                          onToggle({ id: connector.id, name: connector.name, checked })
                        }
                        checkboxProps={getEbtProps({
                          element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
                          action: CONTEXT_ENGINE_UI_EBT.action.sources.TOGGLE_CONNECTOR,
                          detail: connector.actionTypeId,
                        })}
                        data-test-subj={`contextConnectorCard-${connector.id}`}
                      />
                    </EuiFlexItem>
                  );
                })}
                {showCreateActions ? (
                  <EuiFlexItem>
                    <AddSourceCard
                      title={i18n.translate(
                        'xpack.contextEngine.sourcePicker.connectors.createButton',
                        { defaultMessage: 'Create connector' }
                      )}
                      description={i18n.translate(
                        'xpack.contextEngine.aiIndexDetail.sources.createConnectorCardDescription',
                        { defaultMessage: 'Not installed yet? Set one up.' }
                      )}
                      onClick={onOpenCreateConnector}
                      isDisabled={disabled}
                      data-test-subj="contextCreateConnectorCard"
                      ebtProps={createCardEbtProps}
                    />
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGrid>
              {availableConnectors.length > 0 ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.contextEngine.aiIndexDetail.sources.selectOneOrMoreConnectors"
                      defaultMessage="Select one or more."
                    />
                  </EuiText>
                </>
              ) : null}
            </>
          )}
        </>
      )}
      {showEmptyPrompt && (
        <>
          <EuiSpacer size="m" />
          <AiIndexDetailPanelEmptyState
            paddingSize="none"
            iconType="plugs"
            dataTestSubj="contextConnectorsEmpty"
            message={
              connectors.length === 0 ? (
                <FormattedMessage
                  id="xpack.contextEngine.sourcePicker.connectors.emptyBodyNoAccess"
                  defaultMessage="No connectors yet. Ask your administrator to create one."
                />
              ) : (
                <FormattedMessage
                  id="xpack.contextEngine.sourcePicker.connectors.allAdded"
                  defaultMessage="All installed connectors are already added."
                />
              )
            }
          />
        </>
      )}
    </div>
  );
};

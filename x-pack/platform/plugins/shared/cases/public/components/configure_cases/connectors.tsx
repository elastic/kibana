/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';

import { ConnectorsDropdown } from './connectors_dropdown';
import * as i18n from './translations';

import type { ActionConnector, CaseConnectorMapping } from '../../containers/configure/types';
import { Mapping } from './mapping';
import type { ActionTypeConnector } from '../../../common/types/domain';
import { ConnectorTypes } from '../../../common/types/domain';
import { DeprecatedCallout } from '../connectors/deprecated_callout';
import { isDeprecatedConnector } from '../utils';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import { useCasesContext } from '../cases_context/use_cases_context';

export interface Props {
  actionTypes: ActionTypeConnector[];
  connectors: ActionConnector[];
  disabled: boolean;
  handleShowEditFlyout: () => void;
  isLoading: boolean;
  mappings: CaseConnectorMapping[];
  onChangeConnector: (id: string) => void;
  selectedConnector: { id: string; type: ConnectorTypes };
  updateConnectorDisabled: boolean;
  onAddNewConnector: () => void;
}
const ConnectorsComponent: React.FC<Props> = ({
  actionTypes,
  connectors,
  disabled,
  handleShowEditFlyout,
  isLoading,
  mappings,
  onChangeConnector,
  selectedConnector,
  updateConnectorDisabled,
  onAddNewConnector,
}) => {
  const { actions } = useApplicationCapabilities();
  const canSave = actions.crud;
  const connector = useMemo(
    () => connectors.find((c) => c.id === selectedConnector.id),
    [connectors, selectedConnector.id]
  );
  const { permissions } = useCasesContext();
  const canUseConnectors = permissions.connectors && actions.read;

  const connectorsName = connector?.name ?? 'none';

  const actionTypeName = useMemo(
    () => actionTypes.find((c) => c.id === selectedConnector.type)?.name ?? i18n.UNKNOWN,
    [actionTypes, selectedConnector.type]
  );

  const dropDownLabel = useMemo(
    () => (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>{i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          {connectorsName !== 'none' && (
            <EuiLink
              disabled={updateConnectorDisabled}
              onClick={handleShowEditFlyout}
              data-test-subj="case-configure-update-selected-connector-button"
            >
              {i18n.UPDATE_SELECTED_CONNECTOR(connectorsName)}
            </EuiLink>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [connectorsName, handleShowEditFlyout, updateConnectorDisabled]
  );
  return (
    <>
      <EuiDescribedFormGroup
        fullWidth
        title={<h3>{i18n.INCIDENT_MANAGEMENT_SYSTEM_TITLE}</h3>}
        description={i18n.INCIDENT_MANAGEMENT_SYSTEM_DESC}
        data-test-subj="case-connectors-form-group"
      >
        <EuiFormRow
          fullWidth
          label={dropDownLabel}
          data-test-subj="case-connectors-form-row"
          labelAppend={
            canSave ? (
              <EuiButtonEmpty
                size="xs"
                data-test-subj="add-new-connector"
                onClick={onAddNewConnector}
              >
                {i18n.ADD_CONNECTOR}
              </EuiButtonEmpty>
            ) : null
          }
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              {canUseConnectors ? (
                <ConnectorsDropdown
                  connectors={connectors}
                  disabled={disabled}
                  selectedConnector={selectedConnector.id}
                  isLoading={isLoading}
                  onChange={onChangeConnector}
                  data-test-subj="case-connectors-dropdown"
                />
              ) : (
                <EuiText data-test-subj="configure-case-connector-permissions-error-msg" size="s">
                  <span>{i18n.READ_ACTIONS_PERMISSIONS_ERROR_MSG}</span>
                </EuiText>
              )}
            </EuiFlexItem>
            {selectedConnector.type !== ConnectorTypes.none && isDeprecatedConnector(connector) && (
              <EuiFlexItem grow={false}>
                <DeprecatedCallout />
              </EuiFlexItem>
            )}
            {selectedConnector.type !== ConnectorTypes.none ? (
              <EuiFlexItem grow={false}>
                <Mapping
                  actionTypeName={actionTypeName}
                  connectorType={selectedConnector.type}
                  isLoading={isLoading}
                  mappings={mappings}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
ConnectorsComponent.displayName = 'Connectors';

export const Connectors = React.memo(ConnectorsComponent);

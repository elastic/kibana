/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';
import { ActionConnectorForm } from './action_connector_form';
import { useAppDependencies } from '../../app_context';
import { ActionConnectorTableItem } from '../../../types';

export interface ConnectorEditProps {
  connector: ActionConnectorTableItem;
}

export const ConnectorEditFlyout = ({ connector }: ConnectorEditProps) => {
  const { actionTypeRegistry } = useAppDependencies();
  const { editFlyoutVisible, setEditFlyoutVisibility } = useActionsConnectorsContext();
  const closeFlyout = useCallback(() => setEditFlyoutVisibility(false), [setEditFlyoutVisibility]);

  if (!editFlyoutVisible) {
    return null;
  }

  const actionTypeModel = actionTypeRegistry.get(connector.actionTypeId);

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {actionTypeModel ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="m" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="flyoutTitle">
                <FormattedMessage
                  defaultMessage="Edit connector"
                  id="xpack.triggersActionsUI.sections.editConnectorForm.flyoutTitle"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <ActionConnectorForm
        initialConnector={{
          ...connector,
          secrets: {},
        }}
        actionTypeName={connector.actionType}
        setFlyoutVisibility={setEditFlyoutVisibility}
      />
    </EuiFlyout>
  );
};

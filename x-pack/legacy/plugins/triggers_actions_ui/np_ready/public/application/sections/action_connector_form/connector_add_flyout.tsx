/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext, useCallback, useState, useEffect, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { ActionsConnectorsContext } from '../../context/actions_connectors_context';
import { ActionTypeMenu } from './action_type_menu';
import { ActionConnectorForm } from './action_connector_form';
import { ActionType } from '../../../types';
import { useAppDependencies } from '../../app_dependencies';

export const ConnectorAddFlyout = () => {
  const { actionTypeRegistry } = useAppDependencies();
  const { addFlyoutVisible, setAddFlyoutVisibility } = useContext(ActionsConnectorsContext);
  const [actionType, setActionType] = useState<ActionType | undefined>(undefined);
  const closeFlyout = useCallback(() => setAddFlyoutVisibility(false), [setAddFlyoutVisibility]);

  useEffect(() => {
    if (addFlyoutVisible) {
      setActionType(undefined);
    }
  }, [addFlyoutVisible]);

  if (!addFlyoutVisible) {
    return null;
  }

  function onActionTypeChange(newActionType: ActionType) {
    setActionType(newActionType);
  }

  let currentForm;
  let actionTypeModel;
  if (!actionType) {
    currentForm = <ActionTypeMenu onActionTypeChange={onActionTypeChange} />;
  } else {
    actionTypeModel = actionTypeRegistry.get(actionType.id);
    const initialConnector = { actionTypeId: actionType.id, config: {}, secrets: {} };

    currentForm = (
      <ActionConnectorForm
        actionTypeName={actionType.name}
        initialConnector={initialConnector}
        setFlyoutVisibility={setAddFlyoutVisibility}
      />
    );
  }

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          {actionTypeModel && actionTypeModel.iconClass ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="xl" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            {actionTypeModel && actionType ? (
              <Fragment>
                <EuiTitle size="s">
                  <h3 id="flyoutTitle">
                    <FormattedMessage
                      defaultMessage="Connector for "
                      id="xpack.triggersActionsUI.sections.addConnectorForm.flyoutTitle"
                    />
                    {actionType.name}
                  </h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  {actionTypeModel.selectMessage}
                </EuiText>
              </Fragment>
            ) : (
              <EuiTitle size="s">
                <h3 id="selectConnectorFlyoutTitle">
                  <FormattedMessage
                    defaultMessage="Select a connector to create"
                    id="xpack.triggersActionsUI.sections.addConnectorForm.selectConnectorFlyoutTitle"
                  />
                </h3>
              </EuiTitle>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {currentForm}
    </EuiFlyout>
  );
};

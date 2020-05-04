/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSwitch,
  EuiAccordion,
  EuiKeyPadMenuItem,
  EuiIcon,
  EuiToolTip,
  EuiCard,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import { AlertAction, ActionForm } from '../../../../../../../plugins/triggers_actions_ui/public';
import { npStart } from '../../../np_imports/legacy_imports';
import {
  loadActionTypes,
  loadAllActions as loadConnectors,
} from '../../../../../../../plugins/triggers_actions_ui/public/application/lib/action_connector_api';
import {
  ActionTypeIndex,
  ActionConnector,
  ActionTypeModel,
  ActionType,
} from '../../../../../../../plugins/triggers_actions_ui/public/types';
import { actionTypeCompare } from '../../../../../../../plugins/triggers_actions_ui/public/application/lib/action_type_compare';
import {
  checkActionFormActionTypeEnabled,
  IsEnabledResult,
  IsDisabledResult,
} from '../../../../../../../plugins/triggers_actions_ui/public/application/lib/check_action_type_enabled';
import { TypeRegistry } from '../../../../../../../plugins/triggers_actions_ui/public/application/type_registry';
import { GUARD_RAILS_SUPPORTED_ACTION_TYPE_IDS } from '../../../../../../../plugins/monitoring/common/constants';

interface Alert {
  type: string;
  exists: boolean;
  enabled: boolean;
  actions: AlertAction[];
  states: AlertState[];
}

interface AlertState {
  firing: boolean;
  state: any;
}

export interface AlertsPanelProps {
  alerts: Alert[];
}

interface AlertStateItemProps {
  alert: Alert;
}

interface AlertsFlyoutProps {
  alerts: Alert[];
  close: () => void;
}

const AlertStateItem: React.FC<AlertStateItemProps> = (props: AlertStateItemProps) => {
  const { alert } = props;
  const [isEnabled, setIsEnabled] = React.useState(alert.enabled);
  const [actions, setActions] = React.useState(alert.actions);

  const actionTypeRegistry: ActionTypeModel[] =
    npStart.plugins.triggers_actions_ui.actionTypeRegistry;

  function save() {
    // console.log('save');
  }

  const buttonContent = (
    <EuiFlexGroup key={alert.type}>
      <EuiFlexItem grow={false}>
        <EuiSwitch label="" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} />
      </EuiFlexItem>
      <EuiFlexItem>{alert.type}</EuiFlexItem>
      <EuiFlexItem grow={false}>{alert.actions.length} connectors</EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiAccordion
      id="accordionForm1"
      className="euiAccordionForm"
      buttonClassName="euiAccordionForm__button"
      buttonContent={buttonContent}
      arrowDisplay="right"
      paddingSize="l"
    >
      <ActionForm
        actions={actions}
        defaultActionGroupId="default"
        setActionIdByIndex={(id, index) => {
          if (isEqual(actions[index].id, id)) {
            return;
          }
          const oldAction = actions.splice(index, 1)[0];
          const updatedAction = {
            ...oldAction,
            id,
          };
          actions.splice(index, 0, updatedAction);
          setActions(actions);
        }}
        // setAlertProperty={(actions: AlertAction[]) =>
        //   console.log('setAlertProperty()', { actions })
        // }
        // setActionParamsProperty={(key: string, value: any, index: number) =>
        //   console.log('setActionParamsProperty()', { key, value, index })
        // }
        http={npStart.core.http}
        actionTypeRegistry={actionTypeRegistry}
        toastNotifications={npStart.core.notifications?.toasts}
        disableActionType={(actionType: ActionType) =>
          !GUARD_RAILS_SUPPORTED_ACTION_TYPE_IDS.includes(actionType.id)
        }
      />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={save} fill>
            Save
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

const AlertsFlyout: React.FC<AlertsFlyoutProps> = (props: AlertsFlyoutProps) => {
  const { alerts } = props;

  return (
    <EuiFlyout onClose={close} aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">Stack monitoring alerts</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {alerts.map(alert => (
          <AlertStateItem key={alert.type} alert={alert} />
        ))}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const AlertsPanel: React.FC<AlertsPanelProps> = (props: AlertsPanelProps) => {
  const { alerts } = props;
  const [showFlyout, setShowFlyout] = React.useState(false);

  const flyout = showFlyout ? (
    <AlertsFlyout alerts={alerts} close={() => setShowFlyout(false)} />
  ) : null;

  if (alerts.length) {
    return (
      <Fragment>
        {flyout}
        <EuiCallOut title="Stack monitoring alerts" color="success">
          <EuiLink onClick={() => setShowFlyout(true)}>Configure</EuiLink>
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    );
  }

  return <h2>Hi</h2>;
};

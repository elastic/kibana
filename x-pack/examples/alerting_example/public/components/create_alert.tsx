/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { EuiIcon, EuiFlexItem, EuiCard, EuiFlexGroup } from '@elastic/eui';

import { AlertsContextProvider, AlertAdd } from '../../../../plugins/triggers_actions_ui/public';
import { AlertingExampleComponentParams } from '../application';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

export const CreateAlert = ({
  http,
  triggersActionsUi,
  charts,
  uiSettings,
  docLinks,
  data,
  toastNotifications,
  capabilities,
}: AlertingExampleComponentParams) => {
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`bell`} />}
          title={`Create Alert`}
          description="Create an new Alert based on one of our example Alert Types ."
          onClick={() => setAlertFlyoutVisibility(true)}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertsContextProvider
          value={{
            http,
            actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
            alertTypeRegistry: triggersActionsUi.alertTypeRegistry,
            toastNotifications,
            uiSettings,
            docLinks,
            charts,
            dataFieldsFormats: data.fieldFormats,
            capabilities,
          }}
        >
          <AlertAdd
            consumer={ALERTING_EXAMPLE_APP_ID}
            addFlyoutVisible={alertFlyoutVisible}
            setAddFlyoutVisibility={setAlertFlyoutVisibility}
          />
        </AlertsContextProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

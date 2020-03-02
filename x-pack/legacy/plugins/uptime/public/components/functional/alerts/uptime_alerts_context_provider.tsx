/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AlertsContextProvider } from '../../../../../../../plugins/triggers_actions_ui/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

interface Props {
  children: any;
  alertFlyoutVisible: boolean;
  setAlertFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const UptimeAlertsContextProvider = ({
  children,
  alertFlyoutVisible,
  setAlertFlyoutVisibility,
}: Props) => {
  const {
    services: {
      data: { fieldFormats },
      http,
      charts,
      notifications,
      triggers_actions_ui: { actionTypeRegistry, alertTypeRegistry },
      uiSettings,
    },
  } = useKibana();

  return (
    <AlertsContextProvider
      value={{
        actionTypeRegistry,
        addFlyoutVisible: alertFlyoutVisible,
        alertTypeRegistry,
        charts,
        dataFieldsFormats: fieldFormats,
        http,
        setAddFlyoutVisibility: setAlertFlyoutVisibility,
        toastNotifications: notifications?.toasts,
        uiSettings,
      }}
    >
      {children}
    </AlertsContextProvider>
  );
};

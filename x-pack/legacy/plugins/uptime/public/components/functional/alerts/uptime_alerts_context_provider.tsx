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
}

export const UptimeAlertsContextProvider = ({ children }: Props) => {
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
        alertTypeRegistry,
        charts,
        dataFieldsFormats: fieldFormats,
        http,
        toastNotifications: notifications?.toasts,
        uiSettings,
      }}
    >
      {children}
    </AlertsContextProvider>
  );
};

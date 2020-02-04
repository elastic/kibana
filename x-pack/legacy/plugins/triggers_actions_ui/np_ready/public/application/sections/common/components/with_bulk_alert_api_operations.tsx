/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Alert, AlertType } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import {
  deleteAlerts,
  disableAlerts,
  enableAlerts,
  muteAlerts,
  unmuteAlerts,
  deleteAlert,
  disableAlert,
  enableAlert,
  muteAlert,
  unmuteAlert,
  loadAlert,
  loadAlertTypes,
} from '../../../lib/alert_api';

export interface ComponentOpts {
  muteAlerts: (alerts: Alert[]) => Promise<void>;
  unmuteAlerts: (alerts: Alert[]) => Promise<void>;
  enableAlerts: (alerts: Alert[]) => Promise<void>;
  disableAlerts: (alerts: Alert[]) => Promise<void>;
  deleteAlerts: (alerts: Alert[]) => Promise<void>;
  muteAlert: (alert: Alert) => Promise<void>;
  unmuteAlert: (alert: Alert) => Promise<void>;
  enableAlert: (alert: Alert) => Promise<void>;
  disableAlert: (alert: Alert) => Promise<void>;
  deleteAlert: (alert: Alert) => Promise<void>;
  loadAlert: (id: Alert['id']) => Promise<Alert>;
  loadAlertTypes: () => Promise<AlertType[]>;
}

export type PropsWithOptionalApiHandlers<T> = Omit<T, keyof ComponentOpts> & Partial<ComponentOpts>;

export function withBulkAlertOperations<T>(
  WrappedComponent: React.ComponentType<T & ComponentOpts>
): React.FunctionComponent<PropsWithOptionalApiHandlers<T>> {
  return (props: PropsWithOptionalApiHandlers<T>) => {
    const { http } = useAppDependencies();
    return (
      <WrappedComponent
        {...(props as T)}
        muteAlerts={async (items: Alert[]) =>
          muteAlerts({ http, ids: items.filter(item => !isAlertMuted(item)).map(item => item.id) })
        }
        unmuteAlerts={async (items: Alert[]) =>
          unmuteAlerts({ http, ids: items.filter(isAlertMuted).map(item => item.id) })
        }
        enableAlerts={async (items: Alert[]) =>
          enableAlerts({ http, ids: items.filter(isAlertDisabled).map(item => item.id) })
        }
        disableAlerts={async (items: Alert[]) =>
          disableAlerts({
            http,
            ids: items.filter(item => !isAlertDisabled(item)).map(item => item.id),
          })
        }
        deleteAlerts={async (items: Alert[]) =>
          deleteAlerts({ http, ids: items.map(item => item.id) })
        }
        muteAlert={async (alert: Alert) => {
          if (!isAlertMuted(alert)) {
            return muteAlert({ http, id: alert.id });
          }
        }}
        unmuteAlert={async (alert: Alert) => {
          if (isAlertMuted(alert)) {
            return unmuteAlert({ http, id: alert.id });
          }
        }}
        enableAlert={async (alert: Alert) => {
          if (isAlertDisabled(alert)) {
            return enableAlert({ http, id: alert.id });
          }
        }}
        disableAlert={async (alert: Alert) => {
          if (!isAlertDisabled(alert)) {
            return disableAlert({ http, id: alert.id });
          }
        }}
        deleteAlert={async (alert: Alert) => deleteAlert({ http, id: alert.id })}
        loadAlert={async (alertId: Alert['id']) => loadAlert({ http, alertId })}
        loadAlertTypes={async () => loadAlertTypes({ http })}
      />
    );
  };
}

function isAlertDisabled(alert: Alert) {
  return alert.enabled === false;
}

function isAlertMuted(alert: Alert) {
  return alert.muteAll === true;
}

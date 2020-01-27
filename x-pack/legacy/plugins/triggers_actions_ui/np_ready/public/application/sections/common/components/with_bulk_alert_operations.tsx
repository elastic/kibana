/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Alert } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import {
  deleteAlerts,
  disableAlerts,
  enableAlerts,
  muteAlerts,
  unmuteAlerts,
} from '../../../lib/alert_api';

export interface ComponentOpts {
  onMuteAlerts: (alerts: Alert[]) => Promise<void>;
  onUnmuteAlerts: (alerts: Alert[]) => Promise<void>;
  onEnableAlerts: (alerts: Alert[]) => Promise<void>;
  onDisableAlerts: (alerts: Alert[]) => Promise<void>;
  onDeleteAlerts: (alerts: Alert[]) => Promise<void>;
}

type PropsWithoutBulkOperationHandlers<T> = Omit<
  T,
  'onMuteAlerts' | 'onUnmuteAlerts' | 'onEnableAlerts' | 'onDisableAlerts' | 'onDeleteAlerts'
>;

export function withBulkAlertOperations<T>(
  WrappedComponent: React.ComponentType<T & ComponentOpts>
): React.FunctionComponent<PropsWithoutBulkOperationHandlers<T>> {
  return (props: PropsWithoutBulkOperationHandlers<T>) => {
    const { http } = useAppDependencies();
    return (
      <WrappedComponent
        {...(props as T)}
        onMuteAlerts={(items: Alert[]) =>
          muteAlerts({ http, ids: items.filter(item => !isAlertMuted(item)).map(item => item.id) })
        }
        onUnmuteAlerts={(items: Alert[]) =>
          unmuteAlerts({ http, ids: items.filter(isAlertMuted).map(item => item.id) })
        }
        onEnableAlerts={(items: Alert[]) =>
          enableAlerts({ http, ids: items.filter(isAlertDisabled).map(item => item.id) })
        }
        onDisableAlerts={(items: Alert[]) =>
          disableAlerts({
            http,
            ids: items.filter(item => !isAlertDisabled(item)).map(item => item.id),
          })
        }
        onDeleteAlerts={(items: Alert[]) => deleteAlerts({ http, ids: items.map(item => item.id) })}
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

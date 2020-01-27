/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { AlertTableItem } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import {
  deleteAlerts,
  disableAlerts,
  enableAlerts,
  muteAlerts,
  unmuteAlerts,
} from '../../../lib/alert_api';

export interface ComponentOpts {
  onMuteAlerts: (alerts: AlertTableItem[]) => Promise<void>;
  onUnmuteAlerts: (alerts: AlertTableItem[]) => Promise<void>;
  onEnableAlerts: (alerts: AlertTableItem[]) => Promise<void>;
  onDisableAlerts: (alerts: AlertTableItem[]) => Promise<void>;
  onDeleteAlerts: (alerts: AlertTableItem[]) => Promise<void>;
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
        onMuteAlerts={(items: AlertTableItem[]) =>
          muteAlerts({ http, ids: items.filter(item => !isAlertMuted(item)).map(item => item.id) })
        }
        onUnmuteAlerts={(items: AlertTableItem[]) =>
          unmuteAlerts({ http, ids: items.filter(isAlertMuted).map(item => item.id) })
        }
        onEnableAlerts={(items: AlertTableItem[]) =>
          enableAlerts({ http, ids: items.filter(isAlertDisabled).map(item => item.id) })
        }
        onDisableAlerts={(items: AlertTableItem[]) =>
          disableAlerts({
            http,
            ids: items.filter(item => !isAlertDisabled(item)).map(item => item.id),
          })
        }
        onDeleteAlerts={(items: AlertTableItem[]) =>
          deleteAlerts({ http, ids: items.map(item => item.id) })
        }
      />
    );
  };
}

function isAlertDisabled(alert: AlertTableItem) {
  return alert.enabled === false;
}

function isAlertMuted(alert: AlertTableItem) {
  return alert.muteAll === true;
}

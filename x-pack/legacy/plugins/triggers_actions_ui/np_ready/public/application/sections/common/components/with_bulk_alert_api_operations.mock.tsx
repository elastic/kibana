/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ComponentOpts, PropsWithOptionalApiHandlers } from './with_bulk_alert_api_operations';

export function withBulkAlertOperations<T>(
  WrappedComponent: React.ComponentType<T & ComponentOpts>
): React.FunctionComponent<PropsWithOptionalApiHandlers<T>> {
  return (props: PropsWithOptionalApiHandlers<T>) => {
    return (
      <WrappedComponent
        {...(props as T)}
        muteAlerts={jest.fn()}
        unmuteAlerts={jest.fn()}
        enableAlerts={jest.fn()}
        disableAlerts={jest.fn()}
        deleteAlerts={jest.fn()}
        muteAlert={jest.fn()}
        unmuteAlert={jest.fn()}
        enableAlert={jest.fn()}
        disableAlert={jest.fn()}
        deleteAlert={jest.fn()}
      />
    );
  };
}

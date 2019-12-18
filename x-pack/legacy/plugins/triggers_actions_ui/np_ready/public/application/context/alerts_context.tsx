/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export interface IAlertsContext {
  alertFlyoutVisible: boolean;
  setAlertFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertsContext = React.createContext({} as IAlertsContext);

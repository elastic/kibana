/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { ConnectorServices } from '../../types';

export interface ConnectorContextValue {
  services: ConnectorServices;
}

export const ConnectorContext = React.createContext<ConnectorContextValue | undefined>(undefined);

export const ConnectorProvider: FC<
  PropsWithChildren<{
    value: ConnectorContextValue;
  }>
> = ({ children, value }) => {
  return <ConnectorContext.Provider value={value}>{children}</ConnectorContext.Provider>;
};

ConnectorProvider.displayName = 'ConnectorProvider';

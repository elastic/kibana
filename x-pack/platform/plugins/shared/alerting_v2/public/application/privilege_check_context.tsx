/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import type { AlertingV2Feature } from '../../common/feature_privileges';

/**
 * Callback that fully replaces the default v2 capability gate inside
 * `RequireAlertingPrivilege`. Receives the same feature set and capability
 * level the gate would normally check so the host app can make an informed
 * access decision using any privilege source it needs.
 */
export type PrivilegeCheck = (
  features: readonly AlertingV2Feature[],
  capability: 'all' | 'read'
) => boolean;

const PrivilegeCheckContext = React.createContext<PrivilegeCheck | undefined>(undefined);

export const PrivilegeCheckProvider = PrivilegeCheckContext.Provider;

export const usePrivilegeCheck = (): PrivilegeCheck | undefined =>
  useContext(PrivilegeCheckContext);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useService } from '@kbn/core-di-browser';
import type { AlertingV2Feature } from '../../common/feature_privileges';
import { UserCapabilities } from '../services/user_capabilities';
import { getAlertingRequiredPrivileges } from '../lib/required_privileges';
import { RequiredPrivilegesPrompt } from './required_privileges_prompt';
import { usePrivilegeCheck } from '../application/privilege_check_context';

export interface RequireAlertingPrivilegeProps {
  /**
   * Set of features whose UI capability is required to view the children. The
   * user must hold every feature's capability (AND semantics).
   */
  features: readonly AlertingV2Feature[];
  /** Human-readable name of the gated page, surfaced in the interstitial. */
  pageName: string;
  /**
   * The gate requires the `write` (all) capability for every
   * feature instead of the minimum `read` capability.
   */
  capability?: 'all' | 'read';
  children: React.ReactNode;
}

/**
 * Gates an alerting_v2 page behind the user's privileges. When a host app
 * provides a `PrivilegeCheck` via context, that callback is the sole authority
 * on access. Otherwise the default v2 `UserCapabilities` check applies.
 */
export const RequireAlertingPrivilege = ({
  features,
  pageName,
  capability = 'read',
  children,
}: RequireAlertingPrivilegeProps) => {
  const userCapabilities = useService(UserCapabilities);
  const solutionScopedCheck = usePrivilegeCheck();

  const hasAccess = solutionScopedCheck
    ? solutionScopedCheck(features, capability)
    : features.every((feature) =>
        capability === 'all'
          ? userCapabilities.canWrite(feature)
          : userCapabilities.canRead(feature)
      );

  if (!hasAccess) {
    return (
      <RequiredPrivilegesPrompt
        pageName={pageName}
        requiredPrivileges={getAlertingRequiredPrivileges(features, capability)}
      />
    );
  }

  return <>{children}</>;
};

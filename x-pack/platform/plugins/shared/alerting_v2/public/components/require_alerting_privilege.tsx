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
 * Gates an alerting_v2 management app behind the user's feature privileges.
 * Renders a "Privileges required" interstitial when the user lacks the minimum
 * `read` capability for the required feature set, otherwise renders the children.
 */
export const RequireAlertingPrivilege = ({
  features,
  pageName,
  capability = 'read',
  children,
}: RequireAlertingPrivilegeProps) => {
  const userCapabilities = useService(UserCapabilities);
  const hasPrivilege = features.every((feature) =>
    capability === 'all' ? userCapabilities.canWrite(feature) : userCapabilities.canRead(feature)
  );

  if (!hasPrivilege) {
    return (
      <RequiredPrivilegesPrompt
        pageName={pageName}
        requiredPrivileges={getAlertingRequiredPrivileges(features, capability)}
      />
    );
  }

  return <>{children}</>;
};

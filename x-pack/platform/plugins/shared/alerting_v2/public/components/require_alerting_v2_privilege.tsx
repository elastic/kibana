/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AlertingV2Feature } from '../../common/feature_privileges';
import { useHasAllAlertingV2Privileges } from '../hooks/use_has_alerting_v2_privilege';
import { getAlertingV2RequiredPrivileges } from '../lib/required_privileges';
import { RequiredPrivilegesPrompt } from './required_privileges_prompt';

export interface RequireAlertingV2PrivilegeProps {
  /**
   * Set of features whose minimum (`read`) UI capability is required to view
   * the children. The user must hold every feature's capability (AND
   * semantics).
   */
  features: readonly AlertingV2Feature[];
  /** Human-readable name of the gated page, surfaced in the interstitial. */
  pageName: string;
  children: React.ReactNode;
}

/**
 * Gates an alerting_v2 management app behind the user's feature privileges.
 * Renders a "Privileges required" interstitial when the user lacks the minimum
 * `read` capability for the required feature set, otherwise renders the children.
 */
export const RequireAlertingV2Privilege = ({
  features,
  pageName,
  children,
}: RequireAlertingV2PrivilegeProps) => {
  const hasPrivilege = useHasAllAlertingV2Privileges(features);

  if (!hasPrivilege) {
    return (
      <RequiredPrivilegesPrompt
        pageName={pageName}
        requiredPrivileges={getAlertingV2RequiredPrivileges(features)}
      />
    );
  }

  return <>{children}</>;
};

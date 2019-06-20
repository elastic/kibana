/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MonitorSummary } from '../../../../common/graphql/types';
import { CheckList } from './check_list';
import { toCondensedCheck } from './to_condensed_check';
import { CondensedCheckList } from './condensed_check_list';

interface MonitorListDrawerProps {
  summary: MonitorSummary | undefined;
  dangerColor: string;
  successColor: string;
}

export const MonitorListDrawer = ({
  dangerColor,
  successColor,
  summary,
}: MonitorListDrawerProps) => {
  if (
    !summary ||
    (!summary.state || !summary.state.checks) ||
    !Array.isArray(summary.state.checks)
  ) {
    return null;
  }
  // TODO: extract this value to a constants file
  if (summary.state.checks.length < 12) {
    return <CheckList checks={summary.state.checks} />;
  } else {
    return (
      <CondensedCheckList
        condensedChecks={toCondensedCheck(summary.state.checks)}
        dangerColor={dangerColor}
        successColor={successColor}
      />
    );
  }
};

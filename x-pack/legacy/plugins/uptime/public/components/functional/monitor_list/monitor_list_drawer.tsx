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
  summary?: MonitorSummary;
  dangerColor: string;
  successColor: string;
  /**
   * The number of checks the component should fully render
   * before squashing them to single rows with condensed details.
   */
  condensedCheckLimit: number;
}

/**
 * The elements shown when the user expands the monitor list rows.
 */
export const MonitorListDrawer = ({
  condensedCheckLimit,
  dangerColor,
  successColor,
  summary,
}: MonitorListDrawerProps) => {
  if (!summary || !summary.state.checks) {
    return null;
  }
  if (summary.state.checks.length < condensedCheckLimit) {
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

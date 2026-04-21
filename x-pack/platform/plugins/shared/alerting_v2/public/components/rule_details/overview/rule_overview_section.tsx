/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRule } from '../rule_context';
import { AlertActivityCard, AlertsOverTimeChart } from '../../alert_activity';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const getDefaultLookback = () => {
  const lte = new Date();
  const gte = new Date(lte.getTime() - THIRTY_DAYS_MS);
  return {
    absolute: { gte: gte.toISOString(), lte: lte.toISOString() },
    relative: { from: 'now-30d', to: 'now' },
  };
};

const lookbackLabel = i18n.translate('xpack.alertingV2.ruleDetails.overview.lookbackLabel', {
  defaultMessage: 'Last 30 days',
});

export const RuleOverviewSection: React.FC = () => {
  const rule = useRule();
  const [{ absolute, relative }] = useState(getDefaultLookback);
  const ruleIds = [rule.id];

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="l"
      alignItems="stretch"
      responsive
      data-test-subj="ruleOverviewSection"
    >
      <EuiFlexItem grow={1}>
        <AlertActivityCard
          ruleIds={ruleIds}
          timeRange={absolute}
          fixedInterval="1 hour"
          lookbackLabel={lookbackLabel}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <AlertsOverTimeChart
          ruleIds={ruleIds}
          timeRange={absolute}
          fixedInterval="1 hour"
          discoverTimeRange={relative}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

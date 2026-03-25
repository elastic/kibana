/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';
import { useKibana } from '../common/lib/kibana';
import { LegacyActionResultsSummary } from './legacy_action_results_summary';
import type { ActionResultsSummaryProps } from './legacy_action_results_summary';
import { UnifiedActionResultsSummary } from './unified_action_results_summary';

export type { ActionResultsSummaryProps };

const ActionResultsSummarySwitch: React.FC<ActionResultsSummaryProps> = (props) => {
  const isUnifiedEnabled = useIsExperimentalFeatureEnabled('unifiedDataTable');
  const { uiActions } = useKibana().services;

  if (isUnifiedEnabled && uiActions) {
    return <UnifiedActionResultsSummary {...props} />;
  }

  return <LegacyActionResultsSummary {...props} />;
};

export const ActionResultsSummary = React.memo(ActionResultsSummarySwitch);

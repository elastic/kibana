/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '../common/lib/kibana';
import type { ActionResultsSummaryProps } from './types';
import { UnifiedActionResultsSummary } from './unified_action_results_summary';

export type { ActionResultsSummaryProps };

const ActionResultsSummarySwitch: React.FC<ActionResultsSummaryProps> = (props) => {
  const { uiActions } = useKibana().services;

  if (uiActions) {
    return <UnifiedActionResultsSummary {...props} />;
  }

  return null;
};

export const ActionResultsSummary = React.memo(ActionResultsSummarySwitch);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';
import { useKibana } from '../common/lib/kibana';
import { LegacyResultsTable } from './legacy_results_table';
import { UnifiedResultsTable } from './unified_results_table';
import type { ResultsTableComponentProps } from './results_table_shared';

export type { ResultsTableComponentProps };

const ResultsTableSwitch: React.FC<ResultsTableComponentProps> = (props) => {
  const isUnifiedEnabled = useIsExperimentalFeatureEnabled('unifiedDataTable');
  const { uiActions, unifiedSearch } = useKibana().services;

  if (isUnifiedEnabled && uiActions && unifiedSearch) {
    return <UnifiedResultsTable {...props} />;
  }

  return <LegacyResultsTable {...props} />;
};

export const ResultsTable = React.memo(ResultsTableSwitch);

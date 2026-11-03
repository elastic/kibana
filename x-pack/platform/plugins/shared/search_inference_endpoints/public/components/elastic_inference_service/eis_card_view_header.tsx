/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EisModelsResultsSummary } from './eis_models_results_summary';
import { EisModelsSortMenu } from './eis_models_sort_menu';

interface EisCardViewHeaderProps {
  catalogTotal: number;
}

export const EisCardViewHeader = ({ catalogTotal }: EisCardViewHeaderProps) => (
  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EisModelsResultsSummary catalogTotal={catalogTotal} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EisModelsSortMenu />
    </EuiFlexItem>
  </EuiFlexGroup>
);

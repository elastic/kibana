/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import type { IlmExplainPhaseCounts } from '../../../types';
import { PatternLabel } from './pattern_label';
import { StatsRollup } from './stats_rollup';

interface Props {
  defaultNumberFormat: string;
  ilmExplainPhaseCounts: IlmExplainPhaseCounts;
  incompatible: number | undefined;
  indices: number | undefined;
  indicesChecked: number | undefined;
  pattern: string;
  patternDocsCount: number;
}

const PatternSummaryComponent: React.FC<Props> = ({
  defaultNumberFormat,
  ilmExplainPhaseCounts,
  incompatible,
  indices,
  indicesChecked,
  pattern,
  patternDocsCount,
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      <PatternLabel
        incompatible={incompatible}
        indices={indices}
        indicesChecked={indicesChecked}
        ilmExplainPhaseCounts={ilmExplainPhaseCounts}
        pattern={pattern}
      />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <StatsRollup
        defaultNumberFormat={defaultNumberFormat}
        docsCount={patternDocsCount}
        incompatible={incompatible}
        indices={indices}
        indicesChecked={indicesChecked}
        pattern={pattern}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const PatternSummary = React.memo(PatternSummaryComponent);

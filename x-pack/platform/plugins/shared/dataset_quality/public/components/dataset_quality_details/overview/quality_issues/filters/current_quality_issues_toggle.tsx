/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip, EuiFilterButton, useGeneratedHtmlId, EuiFlexGroup } from '@elastic/eui';
import { useQualityIssuesFilters } from '../../../../../hooks/use_quality_issues_filters';
import {
  currentIssuesToggleSwitch,
  currentIssuesToggleSwitchTooltip,
} from '../../../../../../common/translations';
export function CurrentQualityIssuesToggle() {
  const toggleTextSwitchId = useGeneratedHtmlId({ prefix: 'toggleTextSwitch' });
  const { toggleCurrentQualityIssues, showCurrentQualityIssues } = useQualityIssuesFilters();
  return (
    <EuiFlexGroup>
      <EuiFilterButton
        hasActiveFilters={showCurrentQualityIssues}
        isSelected={showCurrentQualityIssues}
        onClick={toggleCurrentQualityIssues}
        aria-describedby={toggleTextSwitchId}
        data-test-subj="datasetQualityDetailsOverviewDegradedFieldToggleSwitch"
        isToggle
      >
        {currentIssuesToggleSwitch}{' '}
        <EuiIconTip content={currentIssuesToggleSwitchTooltip} position="top" />
      </EuiFilterButton>
    </EuiFlexGroup>
  );
}

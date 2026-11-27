/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiText } from '@elastic/eui';
import { OVERVIEW_SECTION_LABELS } from './overview_translations';

/**
 * A placeholder for the sections an agent has not written yet, shown while it works on an
 * investigation. A short note says more is coming, and the skeleton stands in for the sections still
 * to come, so the flyout does not read as finished.
 */
export const OverviewLoadingSection = memo(() => (
  <EuiFlexGroup
    direction="column"
    gutterSize="s"
    data-test-subj="investigationOverviewLoadingSection"
  >
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        <p>{OVERVIEW_SECTION_LABELS.loading}</p>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiSkeletonText
        lines={3}
        size="s"
        isLoading
        contentAriaLabel={OVERVIEW_SECTION_LABELS.loading}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
));

OverviewLoadingSection.displayName = 'OverviewLoadingSection';

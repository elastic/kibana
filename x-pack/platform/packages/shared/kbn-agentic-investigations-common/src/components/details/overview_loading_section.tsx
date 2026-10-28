/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonTitle, EuiSkeletonText } from '@elastic/eui';
import { OVERVIEW_SECTION_LABELS } from './overview_translations';

/**
 * A placeholder for the sections an agent has not written yet, shown under everything the
 * investigation has so far while it is still being worked on. It stands in for a section heading
 * and its body, so the flyout reads as "more is coming here" rather than as finished.
 */
export const OverviewLoadingSection = memo(() => (
  <EuiFlexGroup
    direction="column"
    gutterSize="s"
    data-test-subj="investigationOverviewLoadingSection"
    aria-label={OVERVIEW_SECTION_LABELS.loading}
  >
    <EuiFlexItem grow={false}>
      <EuiSkeletonTitle size="xs" css={{ inlineSize: '40%' }} isLoading announceLoadedStatus={false} />
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

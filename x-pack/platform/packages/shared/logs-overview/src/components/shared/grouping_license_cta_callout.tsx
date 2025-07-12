/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  GroupingLicenseCtaMessageDetailsButton,
  GroupingLicenseCtaMessageDetailsButtonProps,
  GroupingLicenseCtaMessageTrialButton,
  GroupingLicenseCtaMessageTrialButtonDependencies,
  groupingLicenseCtaMessageDescription,
  groupingLicenseCtaMessageTitle,
} from './grouping_license_cta_shared';

export type GroupingLicenseCtaCalloutProps = GroupingLicenseCtaMessageDetailsButtonProps & {
  dependencies: GroupingLicenseCtaCalloutDependencies;
};

export type GroupingLicenseCtaCalloutDependencies =
  GroupingLicenseCtaMessageTrialButtonDependencies;

export const GroupingLicenseCtaCallout = React.memo<GroupingLicenseCtaCalloutProps>(
  ({ dependencies, showDetails }) => {
    // Recording the time when the callout was dismissed in case we want to
    // introduce a timeout later to show it again after a certain period.
    const [groupingLicenseCtaCalloutDismissedAt, setGroupingLicenseCtaCalloutDismissedAt] =
      useLocalStorage<number | undefined>(CALLOUT_DISMISSED_AT_LOCAL_STORAGE_KEY, undefined);

    const dismissCtaCallout = React.useCallback(() => {
      setGroupingLicenseCtaCalloutDismissedAt(Date.now());
    }, [setGroupingLicenseCtaCalloutDismissedAt]);

    // Currently we don't have a timeout for the callout, so it will be shown only once.
    if (groupingLicenseCtaCalloutDismissedAt != null) {
      return null;
    }

    return (
      <EuiCallOut
        title={groupingLicenseCtaMessageTitle}
        iconType="sparkles"
        onDismiss={dismissCtaCallout}
        data-test-subj="logsOverviewGroupingLicenseCtaCallout"
      >
        <p>{groupingLicenseCtaMessageDescription}</p>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <GroupingLicenseCtaMessageTrialButton dependencies={dependencies} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <GroupingLicenseCtaMessageDetailsButton showDetails={showDetails} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    );
  }
);

export const CALLOUT_DISMISSED_AT_LOCAL_STORAGE_KEY =
  'logsOverview:groupingLicenseCtaCalloutDismissedAt';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import React from 'react';
import type {
  GroupingLicenseCtaMessageDetailsButtonProps,
  GroupingLicenseCtaMessageTrialButtonDependencies,
} from './grouping_license_cta_shared';
import {
  GroupingLicenseCtaMessageDetailsButton,
  GroupingLicenseCtaMessageTrialButton,
  groupingLicenseCtaMessageDescription,
  groupingLicenseCtaMessageTitle,
} from './grouping_license_cta_shared';

export type GroupingLicenseCtaPopoverProps = GroupingLicenseCtaMessageDetailsButtonProps & {
  dependencies: GroupingLicenseCtaPopoverDependencies;
};

export type GroupingLicenseCtaPopoverDependencies =
  GroupingLicenseCtaMessageTrialButtonDependencies;

export const GroupingLicenseCtaPopover = React.memo<GroupingLicenseCtaPopoverProps>(
  ({ dependencies, showDetails }) => {
    const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

    const groupingCtaPopoverButton = React.useMemo(
      () => (
        <EuiButton
          color="text"
          iconType="arrowDown"
          iconSide="right"
          data-test-subj="logsOverviewGroupingCtaPopoverButton"
          onClick={togglePopover}
        >
          {groupingCtaPopoverButtonTitle}
        </EuiButton>
      ),
      [togglePopover]
    );

    return (
      <EuiPopover
        button={groupingCtaPopoverButton}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downRight"
      >
        <EuiPopoverTitle>{groupingLicenseCtaMessageTitle}</EuiPopoverTitle>
        <div style={{ width: '300px' }}>
          <EuiText>
            <p>{groupingLicenseCtaMessageDescription}</p>
          </EuiText>
        </div>
        <EuiPopoverFooter>
          <EuiFlexGroup direction="row" gutterSize="s">
            {GroupingLicenseCtaMessageTrialButton.canRender(dependencies) ? (
              <EuiFlexItem grow={false}>
                <GroupingLicenseCtaMessageTrialButton dependencies={dependencies} />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <GroupingLicenseCtaMessageDetailsButton showDetails={showDetails} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverFooter>
      </EuiPopover>
    );
  }
);

const groupingCtaPopoverButtonTitle = i18n.translate(
  'xpack.observabilityLogsOverview.groupingLicenseCtaPopoverButtonTitle',
  {
    defaultMessage: 'Log Patterns',
  }
);

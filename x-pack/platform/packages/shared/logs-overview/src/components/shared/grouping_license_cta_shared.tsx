/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonEmptyProps, EuiButtonProps } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { i18n } from '@kbn/i18n';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import React from 'react';

export type GroupingLicenseCtaMessageDetailsButtonProps = Pick<EuiButtonEmptyProps, 'size'> & {
  showDetails: () => void;
};

export const GroupingLicenseCtaMessageDetailsButton: React.FC<
  GroupingLicenseCtaMessageDetailsButtonProps
> = ({ showDetails, ...buttonProps }) => (
  <EuiButtonEmpty {...buttonProps} color="primary" onClick={showDetails}>
    {groupingLicenseCtaMessageDetailsButtonTitle}
  </EuiButtonEmpty>
);

export type GroupingLicenseCtaMessageTrialButtonProps = Pick<EuiButtonProps, 'size'> & {
  dependencies: GroupingLicenseCtaMessageTrialButtonDependencies;
};

export interface GroupingLicenseCtaMessageTrialButtonDependencies {
  share: SharePluginStart;
}

export const GroupingLicenseCtaMessageTrialButton: React.FC<GroupingLicenseCtaMessageTrialButtonProps> & {
  canRender: (dependencies: GroupingLicenseCtaMessageTrialButtonDependencies) => boolean;
} = ({ dependencies, ...buttonProps }) => {
  const licenseManagementUrl = dependencies.share.url.locators
    .get(MANAGEMENT_APP_LOCATOR)
    ?.useUrl({ sectionId: 'stack', appId: 'license_management' });

  return (
    <EuiButton
      {...buttonProps}
      href={licenseManagementUrl}
      isDisabled={licenseManagementUrl == null}
    >
      {groupingLicenseCtaMessageTrialButtonTitle}
    </EuiButton>
  );
};

GroupingLicenseCtaMessageTrialButton.canRender = (
  dependencies: GroupingLicenseCtaMessageTrialButtonDependencies
): boolean => {
  return dependencies.share.url.locators.get(MANAGEMENT_APP_LOCATOR) != null;
};

export const groupingLicenseCtaMessageTitle = i18n.translate(
  'xpack.observabilityLogsOverview.groupingLicenseCtaMessageTitle',
  {
    defaultMessage: 'Unlock advanced log insights',
  }
);

export const groupingLicenseCtaMessageDescription = i18n.translate(
  'xpack.observabilityLogsOverview.groupingLicenseCtaMessageDescription',
  {
    defaultMessage:
      'Get instant access to machine learning patterns that group and highlight your most important logs.',
  }
);

export const groupingLicenseCtaMessageDetailsButtonTitle = i18n.translate(
  'xpack.observabilityLogsOverview.groupingLicenseCtaMessageDetailsButtonTitle',
  {
    defaultMessage: 'See how it works',
  }
);

export const groupingLicenseCtaMessageTrialButtonTitle = i18n.translate(
  'xpack.observabilityLogsOverview.groupingLicenseCtaMessageTrialButtonTitle',
  {
    defaultMessage: 'Start free trial',
  }
);

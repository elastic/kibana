/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { AssistantCallToAction, type AssistantCallToActionProps } from '../call_to_action';

import { translations } from './need_license_upgrade.translations';

/** Data test subject for the manage license button. */
export const DATA_TEST_SUBJ_MANAGE_LICENSE_BUTTON = 'aiCTAManageLicenseButton';

/**
 * Props for the `NeedLicenseUpgrade` call to action.
 */
export interface NeedLicenseUpgradeProps
  extends Pick<AssistantCallToActionProps, 'data-test-subj' | 'centered'> {
  /** Callback to handle managing the license. */
  onManageLicense: () => void;
}

/**
 * A pure component that renders a call to action to upgrade a license.
 */
export const NeedLicenseUpgrade = ({ onManageLicense, ...props }: NeedLicenseUpgradeProps) => (
  <AssistantCallToAction
    title={translations.title}
    description={translations.description}
    {...props}
  >
    <EuiButton
      onClick={onManageLicense}
      iconType="gear"
      fill
      data-test-subj={DATA_TEST_SUBJ_MANAGE_LICENSE_BUTTON}
    >
      {translations.buttonLabel}
    </EuiButton>
  </AssistantCallToAction>
);

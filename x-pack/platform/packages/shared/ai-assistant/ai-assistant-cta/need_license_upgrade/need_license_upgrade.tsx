/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { AssistantCallToAction } from '../call_to_action';

import { translations } from './need_license_upgrade.translations';

/**
 * Props for the `NeedLicenseUpgrade` call to action.
 */
export interface NeedLicenseUpgradeProps {
  /** Callback to handle managing the license. */
  onManageLicense: () => void;
}

/**
 * A pure component that renders a call to action to upgrade a license.
 */
export const NeedLicenseUpgrade = ({ onManageLicense }: NeedLicenseUpgradeProps) => (
  <AssistantCallToAction title={translations.title} description={translations.description}>
    <EuiButton onClick={onManageLicense} iconType="gear" fill>
      {translations.buttonLabel}
    </EuiButton>
  </AssistantCallToAction>
);

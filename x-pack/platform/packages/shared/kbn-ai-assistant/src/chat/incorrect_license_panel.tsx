/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NeedLicenseUpgrade } from '@kbn/ai-assistant-cta';
import { useLicenseManagementLocator } from '../hooks/use_license_management_locator';

// TODO - onManageLicense does not work in serverless.
export function IncorrectLicensePanel() {
  const handler = useLicenseManagementLocator();

  const onManageLicense = () => {
    if (handler) {
      handler();
    }
  };

  return <NeedLicenseUpgrade onManageLicense={onManageLicense} />;
}

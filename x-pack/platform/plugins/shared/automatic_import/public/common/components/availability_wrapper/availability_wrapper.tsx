/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { LicensePaywallCard } from './license_paywall_card';
import { useAvailability } from '../../hooks/use_availability';

type AvailabilityWrapperProps = PropsWithChildren<{}>;
export const AvailabilityWrapper = React.memo<AvailabilityWrapperProps>(({ children }) => {
  const { hasLicense, renderUpselling } = useAvailability();
  if (renderUpselling) {
    return <>{renderUpselling}</>;
  }
  if (!hasLicense) {
    return <LicensePaywallCard />;
  }
  return <>{children}</>;
});
AvailabilityWrapper.displayName = 'AvailabilityWrapper';

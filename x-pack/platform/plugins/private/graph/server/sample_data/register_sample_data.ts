/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SampleDataRegistrySetup } from '@kbn/home-plugin/server';
import { registerLogsSampleData, registerLogsSampleDataLink } from './logs';
import { registerEcommerceSampleData, registerEcommerceSampleDataLink } from './ecommerce';
import { registerFlightsSampleData, registerFlightsSampleDataLink } from './flights';
import { LicenseState } from '../lib/license_state';

export function registerSampleData(
  sampleDataRegistry: SampleDataRegistrySetup,
  licenseState: LicenseState
) {
  // always register the saved objects...
  registerEcommerceSampleData(sampleDataRegistry);
  registerFlightsSampleData(sampleDataRegistry);
  registerLogsSampleData(sampleDataRegistry);

  // but wait for a license actually supporting Graph to add links to the sample data panels
  const licenseUpdates = licenseState.getLicenseInformation$();
  if (licenseUpdates === null) {
    throw new Error('License state has to be initialized before registering sample data');
  }
  let registered = false;
  licenseUpdates.subscribe((licenseInformation) => {
    if (!registered && licenseInformation.showAppLink) {
      registered = true;
      registerEcommerceSampleDataLink(sampleDataRegistry);
      registerFlightsSampleDataLink(sampleDataRegistry);
      registerLogsSampleDataLink(sampleDataRegistry);
    }
  });
}

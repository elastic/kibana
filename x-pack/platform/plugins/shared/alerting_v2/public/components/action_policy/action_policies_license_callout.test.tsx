/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ActionPoliciesLicenseCallout } from './action_policies_license_callout';

let mockIsLicenseValid = false;
let mockCanManageLicense = true;

jest.mock('../../hooks/use_is_action_policies_license_valid', () => ({
  useIsActionPoliciesLicenseValid: () => mockIsLicenseValid,
}));

jest.mock('@kbn/core-di-browser', () => ({
  ...jest.requireActual('@kbn/core-di-browser'),
  useService: () => ({
    capabilities: { management: { stack: { license_management: mockCanManageLicense } } },
    getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}/${path}`,
  }),
}));

const renderCallout = () =>
  render(
    <I18nProvider>
      <ActionPoliciesLicenseCallout />
    </I18nProvider>
  );

describe('ActionPoliciesLicenseCallout', () => {
  beforeEach(() => {
    mockIsLicenseValid = false;
    mockCanManageLicense = true;
  });

  it('renders nothing when the license is valid', () => {
    mockIsLicenseValid = true;
    renderCallout();

    expect(screen.queryByTestId('actionPoliciesLicenseCallout')).toBeNull();
  });

  it('links to license management when the user can manage the license', () => {
    renderCallout();

    expect(screen.getByTestId('actionPoliciesLicenseCallout')).toBeInTheDocument();
    expect(screen.getByTestId('actionPoliciesLicenseCalloutManageLicense')).toHaveAttribute(
      'href',
      '/app/management/stack/license_management'
    );
  });

  it('omits the license management link when the user cannot manage the license', () => {
    mockCanManageLicense = false;
    renderCallout();

    expect(screen.getByTestId('actionPoliciesLicenseCallout')).toBeInTheDocument();
    expect(screen.queryByTestId('actionPoliciesLicenseCalloutManageLicense')).toBeNull();
  });
});

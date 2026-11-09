/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import { LicensePageHeader } from '../public/application/sections/license_dashboard/license_page_header';
import { createMockLicense, getComponent } from './util';

describe('LicenseStatus component', () => {
  test('should display normally when license is active', () => {
    getComponent(
      {
        license: createMockLicense('gold'),
      },
      LicensePageHeader
    );
    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Your Gold license is active');
    expect(screen.getByTestId('appHeaderBadge')).toHaveTextContent('Active');
    expect(screen.getByTestId('appHeaderDescription')).toHaveTextContent(
      'Your license will expire on October 12, 2099 8:00 PM EDT'
    );
  });
  test('should display display warning is expired', () => {
    getComponent(
      {
        license: createMockLicense('platinum', 0),
      },
      LicensePageHeader
    );
    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent(
      'Your Platinum license has expired'
    );
    expect(screen.getByTestId('appHeaderBadge')).toHaveTextContent('Inactive');
    expect(screen.getByTestId('appHeaderDescription')).toHaveTextContent('Your license expired on');
  });
});

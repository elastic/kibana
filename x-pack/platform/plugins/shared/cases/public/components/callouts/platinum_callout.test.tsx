/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { PlatinumLicenseCallout } from './platinum_callout';
import { renderWithTestingProviders } from '../../common/mock';

describe('PlatinumLicenseCallout ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    renderWithTestingProviders(<PlatinumLicenseCallout />);

    expect(screen.getByTestId('case-callout-license-info')).toBeInTheDocument();
    expect(screen.getByText('Upgrade to an appropriate license')).toBeInTheDocument();
  });
});

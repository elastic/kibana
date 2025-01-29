/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { installationStatuses } from '../../../../../../common/constants';

import {
  InstallationStatus,
  getLineClampStyles,
  shouldShowInstallationStatus,
} from './installation_status';

// Mock useEuiTheme to return a mock theme
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({
    euiTheme: {
      border: { radius: { medium: '4px' } },
      size: { s: '8px', m: '16px' },
      colors: { emptyShade: '#FFFFFF' },
    },
  }),
}));

describe('getLineClampStyles', () => {
  it('returns the correct styles when lineClamp is provided', () => {
    expect(getLineClampStyles(3)).toEqual(
      '-webkit-line-clamp: 3;display: -webkit-box;-webkit-box-orient: vertical;overflow: hidden;'
    );
  });

  it('returns an empty string when lineClamp is not provided', () => {
    expect(getLineClampStyles()).toEqual('');
  });
});

describe('shouldShowInstallationStatus', () => {
  it('returns false when showInstallationStatus is false', () => {
    expect(
      shouldShowInstallationStatus({
        installStatus: installationStatuses.Installed,
        showInstallationStatus: false,
      })
    ).toEqual(false);
  });

  it('returns true when showInstallationStatus is true and installStatus is installed', () => {
    expect(
      shouldShowInstallationStatus({
        installStatus: installationStatuses.Installed,
        showInstallationStatus: true,
      })
    ).toEqual(true);
  });

  it('returns true when showInstallationStatus is true and installStatus is installFailed', () => {
    expect(
      shouldShowInstallationStatus({
        installStatus: installationStatuses.InstallFailed,
        showInstallationStatus: true,
      })
    ).toEqual(true);
  });
});

describe('InstallationStatus', () => {
  it('renders null when showInstallationStatus is false', () => {
    const { container } = render(
      <InstallationStatus
        installStatus={installationStatuses.Installed}
        showInstallationStatus={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the Installed status correctly', () => {
    render(
      <InstallationStatus
        installStatus={installationStatuses.Installed}
        showInstallationStatus={true}
      />
    );
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });

  it('renders the Install Failed status correctly', () => {
    render(
      <InstallationStatus
        installStatus={installationStatuses.InstallFailed}
        showInstallationStatus={true}
      />
    );
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });

  it('renders null when installStatus is null or undefined', () => {
    const { container } = render(
      <InstallationStatus installStatus={null} showInstallationStatus={true} />
    );
    expect(container.firstChild).toBeNull();

    const { container: undefinedContainer } = render(
      <InstallationStatus installStatus={undefined} showInstallationStatus={true} />
    );
    expect(undefinedContainer.firstChild).toBeNull();
  });

  it('applies the correct styles for the component', () => {
    const { getByTestId } = render(
      <InstallationStatus
        installStatus={installationStatuses.Installed}
        showInstallationStatus={true}
      />
    );

    const spacer = getByTestId('installation-status-spacer');
    const callout = getByTestId('installation-status-callout');

    expect(spacer).toHaveStyle('background: #FFFFFF');
    expect(callout).toHaveStyle('padding: 8px 16px');
    expect(callout).toHaveTextContent('Installed');
  });
});

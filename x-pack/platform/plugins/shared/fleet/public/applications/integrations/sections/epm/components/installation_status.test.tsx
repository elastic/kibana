/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

import { userEvent } from '@testing-library/user-event';

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

  it('returns true when showInstallationStatus is true and isActive is true', () => {
    expect(
      shouldShowInstallationStatus({
        installStatus: installationStatuses.InstallFailed,
        showInstallationStatus: true,
        isActive: true,
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

  it('renders the Installation Failed status correctly', async () => {
    const { getByText, getByTestId } = render(
      <InstallationStatus
        installStatus={installationStatuses.InstallFailed}
        showInstallationStatus={true}
      />
    );
    const calloutText = getByText('Installed');
    const callout = getByTestId('installation-status-callout');
    expect(callout).toHaveTextContent('Installed');

    userEvent.hover(calloutText);

    await waitFor(() => {
      const test = getByText('This package is installed but failed.');
      expect(test).toBeInTheDocument();
    });
  });

  it('renders the Installed status correctly', async () => {
    const { getByTestId, getByText } = render(
      <InstallationStatus
        installStatus={installationStatuses.Installed}
        showInstallationStatus={true}
      />
    );

    const spacer = getByTestId('installation-status-spacer');
    const callout = getByTestId('installation-status-callout');
    const calloutText = getByText('Installed');

    expect(spacer).toHaveStyle('background: #FFFFFF');
    expect(callout).toHaveTextContent('Installed');

    userEvent.hover(calloutText);

    await waitFor(() => {
      const tooltip = getByTestId('installed-tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });

  it('renders the Active status correctly', async () => {
    const { getByTestId } = render(
      <InstallationStatus
        installStatus={installationStatuses.Installed}
        showInstallationStatus={true}
        hasDataStreams={true}
      />
    );

    const spacer = getByTestId('installation-status-spacer');
    const callout = getByTestId('installation-status-callout');

    expect(spacer).toHaveStyle('background: #FFFFFF');
    expect(callout).toHaveTextContent('Active');
  });

  it('renders the compressed installed status', async () => {
    const { getByTestId, getByText } = render(
      <InstallationStatus
        installStatus={installationStatuses.Installed}
        showInstallationStatus={true}
        compressed={true}
      />
    );

    const icon = getByTestId('compressed-installed-icon');

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-euiicon-type', 'warningFilled');

    userEvent.hover(icon);

    await waitFor(() => {
      const tooltip = getByTestId('compressed-installed-tooltip');
      expect(tooltip).toBeInTheDocument();

      const test = getByText('This package is installed but no data streams exist.');
      expect(test).toBeInTheDocument();
    });
  });

  it('renders the compressed installation failed status', async () => {
    const { getByTestId } = render(
      <InstallationStatus
        installStatus={installationStatuses.Installed}
        showInstallationStatus={true}
        compressed={true}
      />
    );

    const icon = getByTestId('compressed-installed-icon');

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-euiicon-type', 'warningFilled');

    userEvent.hover(icon);

    await waitFor(() => {
      const tooltip = getByTestId('compressed-installed-tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });

  it('renders the compressed active status', async () => {
    const { getByTestId } = render(
      <InstallationStatus
        installStatus={installationStatuses.Installed}
        showInstallationStatus={true}
        compressed={true}
        hasDataStreams={true}
      />
    );

    const icon = getByTestId('compressed-active-icon');

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-euiicon-type', 'checkInCircleFilled');
  });
});

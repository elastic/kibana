/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../../types';

import { DeprecationCallout } from './overview';

const mockUseLink = jest.fn();

jest.mock('../../../../../../../hooks', () => {
  const actual = jest.requireActual('../../../../../../../hooks');
  return {
    ...actual,
    useLink: () => mockUseLink(),
  };
});

describe('DeprecationCallout', () => {
  const mockGetHref = jest.fn((page: string, params?: any) => {
    if (params?.pkgkey) {
      return `/app/integrations/detail/${params.pkgkey}/overview`;
    }
    return '/';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLink.mockReturnValue({
      getHref: mockGetHref,
    });
  });

  function renderDeprecationCallout(packageInfo: Partial<PackageInfo>) {
    return render(
      <I18nProvider>
        <DeprecationCallout packageInfo={packageInfo as PackageInfo} />
      </I18nProvider>
    );
  }

  it('should render deprecation callout with basic description', () => {
    const packageInfo = {
      name: 'test-package',
      deprecated: {
        description: 'This integration is no longer maintained',
      },
    };

    renderDeprecationCallout(packageInfo as PackageInfo);

    expect(screen.getByTestId('deprecationCallout')).toBeInTheDocument();
    expect(screen.getByText('This integration is deprecated')).toBeInTheDocument();
    expect(screen.getByText('This integration is no longer maintained')).toBeInTheDocument();
  });

  it('should display "since" version when provided', () => {
    const packageInfo = {
      name: 'test-package',
      deprecated: {
        description: 'No longer supported',
        since: '8.0.0',
      },
    };

    renderDeprecationCallout(packageInfo as PackageInfo);

    expect(screen.getByText('This integration is deprecated')).toBeInTheDocument();
    expect(screen.getByText('No longer supported')).toBeInTheDocument();
    expect(screen.getByText(/Deprecated since version 8.0.0/)).toBeInTheDocument();
  });

  it('should display replacement package link when provided', () => {
    const packageInfo = {
      name: 'old-package',
      deprecated: {
        description: 'This package is no longer maintained',
        replaced_by: {
          package: 'new-package',
          policyTemplate: 'default',
        },
      },
    };

    renderDeprecationCallout(packageInfo as PackageInfo);

    expect(screen.getByText('This integration is deprecated')).toBeInTheDocument();
    expect(screen.getByText('This package is no longer maintained')).toBeInTheDocument();
    expect(screen.getByText(/Please use.*instead/)).toBeInTheDocument();

    const link = screen.getByText('new-package');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/app/integrations/detail/new-package/overview');
  });

  it('should display all deprecation details when fully populated', () => {
    const packageInfo = {
      name: 'legacy-package',
      deprecated: {
        description: 'This integration has been superseded by a newer version',
        since: '7.15.0',
        replaced_by: {
          package: 'modern-package',
          policyTemplate: 'default',
        },
      },
    };

    renderDeprecationCallout(packageInfo as PackageInfo);

    expect(screen.getByTestId('deprecationCallout')).toBeInTheDocument();
    expect(screen.getByText('This integration is deprecated')).toBeInTheDocument();
    expect(
      screen.getByText('This integration has been superseded by a newer version')
    ).toBeInTheDocument();
    expect(screen.getByText(/Deprecated since version 7.15.0/)).toBeInTheDocument();

    const link = screen.getByText('modern-package');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/app/integrations/detail/modern-package/overview');
  });

  it('should display deprecation callout within conditions', () => {
    const packageInfo = {
      name: 'test-package',
      conditions: {
        deprecated: {
          description: 'This integration is no longer maintained',
        },
      },
    };

    renderDeprecationCallout(packageInfo as PackageInfo);

    expect(screen.getByText('This integration is deprecated')).toBeInTheDocument();
    expect(screen.getByText('This integration is no longer maintained')).toBeInTheDocument();
  });

  it('should not display "since" section when not provided', () => {
    const packageInfo = {
      name: 'test-package',
      deprecated: {
        description: 'Deprecated integration',
      },
    };

    renderDeprecationCallout(packageInfo as PackageInfo);

    expect(screen.getByText('This integration is deprecated')).toBeInTheDocument();
    expect(screen.queryByText(/Deprecated since version/)).not.toBeInTheDocument();
  });

  it('should not display replacement link when not provided', () => {
    const packageInfo = {
      name: 'test-package',
      deprecated: {
        description: 'Deprecated with no replacement',
      },
    };

    renderDeprecationCallout(packageInfo as PackageInfo);

    expect(screen.getByText('This integration is deprecated')).toBeInTheDocument();
    expect(screen.queryByText(/Please use/)).not.toBeInTheDocument();
  });

  it('should handle deprecated info with only package replacement (no policyTemplate)', () => {
    const packageInfo = {
      name: 'test-package',
      deprecated: {
        description: 'Moved to new package',
        replaced_by: {
          package: 'replacement-package',
        },
      },
    };

    renderDeprecationCallout(packageInfo as PackageInfo);

    const link = screen.getByText('replacement-package');
    expect(link).toBeInTheDocument();
    expect(mockGetHref).toHaveBeenCalledWith('integration_details_overview', {
      pkgkey: 'replacement-package',
    });
  });

  it('should have warning color and icon', () => {
    const packageInfo = {
      name: 'test-package',
      deprecated: {
        description: 'Deprecated',
      },
    };

    const { container } = renderDeprecationCallout(packageInfo as PackageInfo);

    const callout = screen.getByTestId('deprecationCallout');
    expect(callout).toHaveClass('euiCallOut--warning');

    const warningIcon = container.querySelector('[data-euiicon-type="warning"]');
    expect(warningIcon).toBeInTheDocument();
  });
});

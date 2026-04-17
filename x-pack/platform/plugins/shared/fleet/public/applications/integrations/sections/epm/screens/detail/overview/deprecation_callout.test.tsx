/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { PackageInfo, RegistryPolicyTemplate } from '../../../../../types';

import type { DeprecationInfo } from '../../../../../../../../common/types';

import {
  DeprecatedFeaturesCallout,
  DeprecationCallout,
  getPackageDeprecationInfo,
  isUpcomingDeprecation,
} from './deprecation_callout';

const mockUseLink = jest.fn();

jest.mock('../../../../../../../../common/services/packages_with_integrations', () => ({
  doesPackageHaveIntegrations: (pkg: any) => (pkg.policy_templates || []).length > 1,
}));

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
    expect(screen.getByText(/Use.*instead/)).toBeInTheDocument();

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

  it('should show deprecation callout when integrationInfo is deprecated and package has multiple integrations', () => {
    const packageInfo = {
      name: 'test-package',
      policy_templates: [
        { name: 'integration-a', title: 'A', description: 'A desc' },
        {
          name: 'integration-b',
          title: 'B',
          description: 'B desc',
          deprecated: { description: 'Integration B is deprecated' },
        },
      ],
    };
    const integrationInfo = {
      name: 'integration-b',
      title: 'B',
      description: 'B desc',
      deprecated: { description: 'Integration B is deprecated' },
    } as RegistryPolicyTemplate;

    render(
      <I18nProvider>
        <DeprecationCallout
          packageInfo={packageInfo as PackageInfo}
          integrationInfo={integrationInfo}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('deprecationCallout')).toBeInTheDocument();
    expect(screen.getByText('Integration B is deprecated')).toBeInTheDocument();
  });

  it('should not show deprecation callout for a non-deprecated integration in a multi-integration package', () => {
    const packageInfo = {
      name: 'test-package',
      policy_templates: [
        { name: 'integration-a', title: 'A', description: 'A desc' },
        {
          name: 'integration-b',
          title: 'B',
          description: 'B desc',
          deprecated: { description: 'B is deprecated' },
        },
      ],
    };
    const integrationInfo = {
      name: 'integration-a',
      title: 'A',
      description: 'A desc',
    } as RegistryPolicyTemplate;

    render(
      <I18nProvider>
        <DeprecationCallout
          packageInfo={packageInfo as PackageInfo}
          integrationInfo={integrationInfo}
        />
      </I18nProvider>
    );

    expect(screen.queryByTestId('deprecationCallout')).not.toBeInTheDocument();
  });

  describe('With upcoming deprecations', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseLink.mockReturnValue({ getHref: mockGetHref });
    });

    it('renders the upcoming deprecation callout with since version', () => {
      render(
        <I18nProvider>
          <DeprecationCallout
            packageInfo={
              {
                name: 'test-package',
                version: '1.0.0',
                deprecated: { description: 'Will be gone soon', since: '2.0.0' },
              } as PackageInfo
            }
          />
        </I18nProvider>
      );

      expect(
        screen.getByText('This integration will be deprecated starting from version 2.0.0')
      ).toBeInTheDocument();
      expect(screen.getByText('Will be gone soon')).toBeInTheDocument();
    });

    it('renders the replaced_by link when provided', () => {
      render(
        <I18nProvider>
          <DeprecationCallout
            packageInfo={
              {
                name: 'test-package',
                version: '1.0.0',
                deprecated: {
                  description: 'Will be replaced',
                  since: '3.0.0',
                  replaced_by: { package: 'new-package' },
                },
              } as PackageInfo
            }
          />
        </I18nProvider>
      );

      const link = screen.getByText('new-package');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/app/integrations/detail/new-package/overview');
    });

    it('does not render a replaced_by link when not provided', () => {
      render(
        <I18nProvider>
          <DeprecationCallout
            packageInfo={
              {
                name: 'test-package',
                version: '1.0.0',
                deprecated: {
                  description: 'Will be replaced',
                  since: '3.0.0',
                },
              } as PackageInfo
            }
          />
        </I18nProvider>
      );

      expect(screen.queryByText(/Use.*instead/)).not.toBeInTheDocument();
    });
  });
});

describe('DeprecatedFeaturesCallout', () => {
  function renderCallout(packageInfo: Record<string, unknown>) {
    return render(
      <I18nProvider>
        <DeprecatedFeaturesCallout packageInfo={packageInfo as unknown as PackageInfo} />
      </I18nProvider>
    );
  }

  it('should not render when no deprecated features exist', () => {
    const packageInfo = {
      name: 'test-package',
      policy_templates: [
        {
          name: 'default',
          title: 'Default',
          description: 'Default template',
          inputs: [
            {
              type: 'logfile',
              title: 'Log input',
              description: 'Collect logs',
            },
          ],
        },
      ],
    };

    renderCallout(packageInfo);
    expect(screen.queryByTestId('deprecatedFeaturesCallout')).not.toBeInTheDocument();
  });

  it('should render when an input is deprecated', () => {
    const packageInfo = {
      name: 'test-package',
      policy_templates: [
        {
          name: 'default',
          title: 'Default',
          description: 'Default template',
          inputs: [
            {
              type: 'logfile',
              title: 'Deprecated Log Input',
              description: 'Collect logs',
              deprecated: {
                description: 'This input is deprecated. Use CEL instead.',
              },
            },
          ],
        },
      ],
    };

    renderCallout(packageInfo);
    expect(screen.getByTestId('deprecatedFeaturesCallout')).toBeInTheDocument();
    expect(screen.getByText('This integration contains deprecated features')).toBeInTheDocument();
    expect(screen.getByText(/Deprecated Log Input/)).toBeInTheDocument();
    expect(screen.getByText(/This input is deprecated. Use CEL instead./)).toBeInTheDocument();
  });

  it('should render when a variable is deprecated', () => {
    const packageInfo = {
      name: 'test-package',
      policy_templates: [
        {
          name: 'default',
          title: 'Default',
          description: 'Default template',
          inputs: [
            {
              type: 'logfile',
              title: 'Log Input',
              description: 'Collect logs',
              vars: [
                {
                  name: 'old_var',
                  type: 'text',
                  title: 'Old Variable',
                  deprecated: {
                    description: 'Use new_var instead.',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    renderCallout(packageInfo);
    expect(screen.getByTestId('deprecatedFeaturesCallout')).toBeInTheDocument();
    expect(screen.getByText(/Old Variable/)).toBeInTheDocument();
    expect(screen.getByText(/Use new_var instead./)).toBeInTheDocument();
  });

  it('should render when a package-level var is deprecated', () => {
    const packageInfo = {
      name: 'test-package',
      policy_templates: [],
      vars: [
        {
          name: 'legacy_setting',
          type: 'text',
          title: 'Legacy Setting',
          deprecated: {
            description: 'This setting is deprecated.',
          },
        },
      ],
    };

    renderCallout(packageInfo);
    expect(screen.getByTestId('deprecatedFeaturesCallout')).toBeInTheDocument();
    expect(screen.getByText(/Legacy Setting/)).toBeInTheDocument();
  });

  it('should render when a data stream has a deprecated stream', () => {
    const packageInfo = {
      name: 'test-package',
      policy_templates: [],
      data_streams: [
        {
          type: 'logs',
          dataset: 'test.access',
          title: 'Test access logs',
          streams: [
            {
              input: 'logfile',
              title: 'Access logs',
              template_path: 'stream.yml.hbs',
              deprecated: {
                description: 'This data stream is deprecated. Use the new CEL stream instead.',
              },
            },
          ],
          package: 'test-package',
          path: 'access',
        },
      ],
    };

    renderCallout(packageInfo);
    expect(screen.getByTestId('deprecatedFeaturesCallout')).toBeInTheDocument();
    expect(screen.getByText(/Access logs/)).toBeInTheDocument();
    expect(
      screen.getByText(/This data stream is deprecated. Use the new CEL stream instead./)
    ).toBeInTheDocument();
  });

  it('should render deprecated policy template as a feature when package has single policy template', () => {
    const packageInfo = {
      name: 'test-package',
      policy_templates: [
        {
          name: 'default',
          title: 'Default Template',
          description: 'Default template',
          deprecated: {
            description: 'This policy template is deprecated.',
          },
          inputs: [],
        },
      ],
    };

    renderCallout(packageInfo);
    expect(screen.getByTestId('deprecatedFeaturesCallout')).toBeInTheDocument();
    expect(screen.getByText(/Default Template/)).toBeInTheDocument();
    expect(screen.getByText(/This policy template is deprecated./)).toBeInTheDocument();
  });

  it('should not render deprecated policy template as a feature when package has multiple policy templates', () => {
    const packageInfo = {
      name: 'test-package',
      policy_templates: [
        {
          name: 'a',
          title: 'Template A',
          description: 'A desc',
          deprecated: {
            description: 'Template A is deprecated.',
          },
          inputs: [],
        },
        {
          name: 'b',
          title: 'Template B',
          description: 'B desc',
          inputs: [],
        },
      ],
    };

    renderCallout(packageInfo);
    expect(screen.queryByTestId('deprecatedFeaturesCallout')).not.toBeInTheDocument();
  });

  it('should render multiple deprecated features', () => {
    const packageInfo = {
      name: 'test-package',
      policy_templates: [
        {
          name: 'default',
          title: 'Default',
          description: 'Default template',
          inputs: [
            {
              type: 'old-input',
              title: 'Old Input',
              description: 'Old input type',
              deprecated: {
                description: 'Input is deprecated.',
              },
              vars: [
                {
                  name: 'old_var',
                  type: 'text',
                  title: 'Old Var',
                  deprecated: {
                    description: 'Variable is deprecated.',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    renderCallout(packageInfo);
    expect(screen.getByTestId('deprecatedFeaturesCallout')).toBeInTheDocument();
    expect(screen.getByText(/Old Input/)).toBeInTheDocument();
    expect(screen.getByText(/Old Var/)).toBeInTheDocument();
  });
});

describe('getPackageDeprecationInfo', () => {
  it('returns undefined when no deprecation fields are set', () => {
    const packageInfo = { name: 'test-package', version: '1.0.0' } as PackageInfo;
    expect(getPackageDeprecationInfo(packageInfo)).toBeUndefined();
  });

  it('returns packageInfo.deprecated when set', () => {
    const deprecated = { description: 'Deprecated' };
    const packageInfo = { name: 'test-package', version: '1.0.0', deprecated } as PackageInfo;
    expect(getPackageDeprecationInfo(packageInfo)).toBe(deprecated);
  });

  it('returns conditions.deprecated when set (takes priority over package.deprecated)', () => {
    const conditionsDeprecated = { description: 'Via conditions' };
    const packageDeprecated = { description: 'Via package' };
    const packageInfo = {
      name: 'test-package',
      version: '1.0.0',
      conditions: { deprecated: conditionsDeprecated },
      deprecated: packageDeprecated,
    } as unknown as PackageInfo;
    expect(getPackageDeprecationInfo(packageInfo)).toBe(conditionsDeprecated);
  });

  it('returns integrationInfo.deprecated for multi-integration packages', () => {
    const integrationDeprecated = { description: 'Integration deprecated' };
    const packageInfo = {
      name: 'test-package',
      version: '1.0.0',
      policy_templates: [{ name: 'a' }, { name: 'b' }],
    } as unknown as PackageInfo;
    const integrationInfo = {
      name: 'a',
      deprecated: integrationDeprecated,
    } as unknown as RegistryPolicyTemplate;
    expect(getPackageDeprecationInfo(packageInfo, integrationInfo)).toBe(integrationDeprecated);
  });
});

describe('isUpcomingDeprecation', () => {
  it('returns false when deprecated is undefined', () => {
    expect(isUpcomingDeprecation('1.0.0', undefined)).toBe(false);
  });

  it('returns false when deprecated has no since field', () => {
    const deprecated: DeprecationInfo = { description: 'Deprecated' };
    expect(isUpcomingDeprecation('1.0.0', deprecated)).toBe(false);
  });

  it('returns true when current version is less than since', () => {
    const deprecated: DeprecationInfo = { description: 'Will be deprecated', since: '2.0.0' };
    expect(isUpcomingDeprecation('1.9.9', deprecated)).toBe(true);
  });

  it('returns false when current version equals since', () => {
    const deprecated: DeprecationInfo = { description: 'Deprecated', since: '2.0.0' };
    expect(isUpcomingDeprecation('2.0.0', deprecated)).toBe(false);
  });

  it('returns false when current version is greater than since', () => {
    const deprecated: DeprecationInfo = { description: 'Deprecated', since: '2.0.0' };
    expect(isUpcomingDeprecation('3.0.0', deprecated)).toBe(false);
  });

  it('returns false for an invalid version string', () => {
    const deprecated: DeprecationInfo = { description: 'Will be deprecated', since: '2.0.0' };
    expect(isUpcomingDeprecation('not-a-version', deprecated)).toBe(false);
  });

  it('handles pre-release version comparison correctly', () => {
    const deprecated: DeprecationInfo = { description: 'Will be deprecated', since: '2.0.0' };
    expect(isUpcomingDeprecation('2.0.0-beta.1', deprecated)).toBe(true);
  });
});

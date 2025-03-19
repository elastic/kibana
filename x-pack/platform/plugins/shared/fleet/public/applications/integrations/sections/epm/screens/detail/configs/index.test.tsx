/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import { isPackagePrerelease } from '../../../../../../../../common/services';
import { useGetInputsTemplatesQuery } from '../../../../../hooks';
import type { PackageInfo } from '../../../../../types';

import { Configs } from '.';

jest.mock('../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../hooks'),
    useGetInputsTemplatesQuery: jest.fn(),
    useConfirmForceInstall: jest.fn(),
    useStartServices: jest.fn().mockReturnValue({
      notifications: {
        toasts: {
          addError: jest.fn(),
          addSuccess: jest.fn(),
        },
      },
      docLinks: {
        links: {
          fleet: {},
        },
      },
    }),
  };
});
jest.mock('../../../../../../../../common/services');

const mockIsPackagePrerelease = isPackagePrerelease as jest.Mock;

function renderComponent(packageInfo: PackageInfo) {
  const renderer = createIntegrationsTestRendererMock();

  return renderer.render(<Configs packageInfo={packageInfo} />);
}

describe('Configs', () => {
  beforeEach(() => {
    mockIsPackagePrerelease.mockReset();
    (useGetInputsTemplatesQuery as jest.Mock).mockReset();
  });

  const packageInfo = {
    name: 'nginx',
    title: 'Nginx',
    version: '1.3.0',
    release: 'ga',
    description: 'Collect logs and metrics from Nginx HTTP servers with Elastic Agent.',
    format_version: '',
    owner: { github: '' },
    assets: {} as any,
    policy_templates: [
      {
        name: 'nginx',
        title: 'Nginx logs and metrics',
        description: 'Collect logs and metrics from Nginx instances',
        inputs: [
          {
            type: 'logfile',
            title: 'Collect logs from Nginx instances',
            description: 'Collecting Nginx access and error logs',
          },
        ],
        multiple: true,
      },
    ],
    data_streams: [
      {
        type: 'logs',
        dataset: 'nginx.access',
        title: 'Nginx access logs',
        release: 'experimental',
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: true,
                required: true,
                show_user: true,
                default: ['/var/log/nginx/access.log*'],
              },
            ],
            template_path: 'stream.yml.hbs',
            title: 'Nginx access logs',
            description: 'Collect Nginx access logs',
            enabled: true,
          },
        ],
        package: 'nginx',
        path: 'access',
      },
    ],
    latestVersion: '1.3.0',
    keepPoliciesUpToDate: false,
    status: 'not_installed',
  } as PackageInfo;

  it('it should display configs tab and a warning if the integration is not installed', () => {
    mockIsPackagePrerelease.mockReturnValue(false);
    (useGetInputsTemplatesQuery as jest.Mock).mockReturnValue({ data: 'yaml configs' });

    const result = renderComponent(packageInfo);
    expect(result.queryByTestId('configsTab.notInstalled')).toBeInTheDocument();
    expect(result.queryByTestId('configsTab.info')).toBeInTheDocument();
    expect(result.queryByTestId('configsTab.codeblock')?.textContent).toContain('yaml configs');
    expect(result.queryByTestId('prereleaseCallout')).not.toBeInTheDocument();
  });

  it('it should display prerelease callout if the package is prerelease', () => {
    mockIsPackagePrerelease.mockReturnValue(true);
    (useGetInputsTemplatesQuery as jest.Mock).mockReturnValue({ data: 'yaml configs' });

    const result = renderComponent(packageInfo);
    expect(result.queryByTestId('configsTab.info')).toBeInTheDocument();
    expect(result.queryByTestId('prereleaseCallout')).toBeInTheDocument();
    expect(result.queryByTestId('configsTab.codeblock')).toBeInTheDocument();
  });

  it('it should display a warning callout if there is an error', () => {
    mockIsPackagePrerelease.mockReturnValue(false);
    (useGetInputsTemplatesQuery as jest.Mock).mockReturnValue({ error: 'some error' });

    const result = renderComponent(packageInfo);
    expect(result.queryByTestId('configsTab.errorCallout')).toBeInTheDocument();
    expect(result.queryByTestId('configsTab.codeblock')).not.toBeInTheDocument();
    expect(result.queryByTestId('configsTab.info')).not.toBeInTheDocument();
  });
});

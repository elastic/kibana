/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { load } from 'js-yaml';

import type { TestRenderer } from '../../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { NewPackagePolicy, PackageInfo } from '../../../../../types';

import { validatePackagePolicy } from '../../services';

import { StepConfigurePackagePolicy } from './step_configure_package';

describe('StepConfigurePackage', () => {
  let packageInfo: PackageInfo;
  let packagePolicy: NewPackagePolicy;
  const mockUpdatePackagePolicy = jest.fn().mockImplementation((val: any) => {
    packagePolicy = {
      ...val,
      ...packagePolicy,
    };
  });

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = (isAgentlessSelected = false) => {
    const validationResults = validatePackagePolicy(packagePolicy, packageInfo, load);

    renderResult = testRenderer.render(
      <StepConfigurePackagePolicy
        packageInfo={packageInfo}
        packagePolicy={packagePolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={false}
        isAgentlessSelected={isAgentlessSelected}
      />
    );
  };

  beforeEach(() => {
    packageInfo = {
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
        {
          name: 'agentless_supported',
          title: 'Agentless Supported',
          description: 'Collect endpoint health the agentless way',
          deployment_modes: {
            default: { enabled: false },
            agentless: { enabled: true },
          },
          inputs: [
            {
              type: 'httpjson',
              title: 'Some agentless input',
              description: 'Collect endpoint health the agentless way',
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
    };
    packagePolicy = {
      name: 'nginx-1',
      description: 'desc',
      namespace: 'default',
      policy_id: '',
      policy_ids: [''],
      enabled: true,
      supports_agentless: true,
      inputs: [
        {
          type: 'logfile',
          policy_template: 'nginx',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'nginx.access' },
              vars: {
                paths: { value: ['/var/log/nginx/access.log*'], type: 'text' },
                tags: { value: ['nginx-access'], type: 'text' },
                preserve_original_event: { value: false, type: 'bool' },
                processors: { type: 'yaml' },
              },
            },
          ],
        },
        {
          type: 'httpjson',
          policy_template: 'agentless_supported',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'http', dataset: 'nginx.access' },
              vars: {
                url: { value: 'http://localhost:8080', type: 'text' },
              },
            },
          ],
        },
      ],
    };
    testRenderer = createFleetTestRendererMock();
  });

  it('should show nothing to configure if no matching integration', async () => {
    packageInfo.policy_templates = [];
    render();

    await waitFor(async () => {
      expect(await renderResult.findByText('Nothing to configure')).toBeInTheDocument();
    });
  });

  it('should show inputs of policy templates and update package policy with input enabled: false', async () => {
    render();

    await waitFor(async () => {
      expect(
        await renderResult.findByText('Collect logs from Nginx instances')
      ).toBeInTheDocument();
    });
    act(() => {
      fireEvent.click(renderResult.getByRole('switch'));
    });
    expect(mockUpdatePackagePolicy.mock.calls[0][0].inputs[0].enabled).toEqual(false);
  });

  it('should render without data streams or vars', async () => {
    packageInfo.data_streams = [];
    packagePolicy.inputs[0].streams = [];

    render();

    await waitFor(async () => {
      expect(
        await renderResult.findByText('Collect logs from Nginx instances')
      ).toBeInTheDocument();
    });
  });

  it('renders only agentless-supported policy templates when agentless is selected', async () => {
    render(true);
    expect(renderResult.queryByText('Some agentless input')).toBeInTheDocument();
    expect(
      await renderResult.queryByText('Collect logs from Nginx instances')
    ).not.toBeInTheDocument();
  });

  it('renders all non-agentless policy templates when agentless is not selected', async () => {
    render();

    expect(await renderResult.queryByText('Collect logs from Nginx instances')).toBeInTheDocument();
    expect(await renderResult.queryByText('Some agentless input')).not.toBeInTheDocument();
  });
});

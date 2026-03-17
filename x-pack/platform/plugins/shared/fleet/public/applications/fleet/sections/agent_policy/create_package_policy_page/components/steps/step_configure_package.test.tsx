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
import { ExperimentalFeaturesService } from '../../../../../services';
import { allowedExperimentalValues } from '../../../../../../../../common/experimental_features';

import { validatePackagePolicy, isInputCompatibleWithVarGroupSelections } from '../../services';

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

  it('should hide deprecated inputs on new installations', async () => {
    packageInfo.policy_templates = [
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
          {
            type: 'deprecated-input',
            title: 'Deprecated input type',
            description: 'This input is deprecated',
            deprecated: {
              description: 'Use the new input instead',
            },
          },
        ],
        multiple: true,
      },
    ];
    packagePolicy.inputs.push({
      type: 'deprecated-input',
      policy_template: 'nginx',
      enabled: true,
      streams: [],
      deprecated: {
        description: 'Use the new input instead',
      },
    });

    render();

    await waitFor(async () => {
      expect(
        await renderResult.findByText('Collect logs from Nginx instances')
      ).toBeInTheDocument();
    });
    expect(renderResult.queryByText('Deprecated input type')).not.toBeInTheDocument();
  });

  it('should show deprecated inputs on edit page', async () => {
    packageInfo.policy_templates = [
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
          {
            type: 'deprecated-input',
            title: 'Deprecated input type',
            description: 'This input is deprecated',
            deprecated: {
              description: 'Use the new input instead',
            },
          },
        ],
        multiple: true,
      },
    ];
    packagePolicy.inputs.push({
      type: 'deprecated-input',
      policy_template: 'nginx',
      enabled: true,
      streams: [],
      deprecated: {
        description: 'Use the new input instead',
      },
    });

    const editPackagePolicy = { ...packagePolicy, supports_agentless: false };
    const validationResults = validatePackagePolicy(editPackagePolicy, packageInfo, load);
    renderResult = testRenderer.render(
      <StepConfigurePackagePolicy
        packageInfo={packageInfo}
        packagePolicy={editPackagePolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={false}
        isEditPage={true}
      />
    );

    await waitFor(async () => {
      expect(
        await renderResult.findByText('Collect logs from Nginx instances')
      ).toBeInTheDocument();
    });
    expect(renderResult.queryByText('Deprecated input type')).toBeInTheDocument();
  });

  it('should hide input when all its streams are deprecated on new installations', async () => {
    packageInfo.data_streams = [
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
            deprecated: {
              description: 'This stream is deprecated.',
            },
          },
        ],
        package: 'nginx',
        path: 'access',
      },
    ];

    render();

    await waitFor(async () => {
      expect(renderResult.queryByText('Collect logs from Nginx instances')).not.toBeInTheDocument();
    });
  });

  it('should show input when all its streams are deprecated on edit page', async () => {
    packageInfo.data_streams = [
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
            deprecated: {
              description: 'This stream is deprecated.',
            },
          },
        ],
        package: 'nginx',
        path: 'access',
      },
    ];

    const editPackagePolicy = { ...packagePolicy, supports_agentless: false };
    const validationResults = validatePackagePolicy(editPackagePolicy, packageInfo, load);
    renderResult = testRenderer.render(
      <StepConfigurePackagePolicy
        packageInfo={packageInfo}
        packagePolicy={editPackagePolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={false}
        isEditPage={true}
      />
    );

    await waitFor(async () => {
      expect(
        await renderResult.findByText('Collect logs from Nginx instances')
      ).toBeInTheDocument();
    });
  });
});

describe('isSingleInputAndStreams behavior', () => {
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const mockUpdatePackagePolicy = jest.fn();

  const singleInputPackageInfo: PackageInfo = {
    name: 'simple_pkg',
    title: 'Simple Package',
    version: '1.0.0',
    release: 'ga',
    description: 'A simple single-input package',
    format_version: '',
    owner: { github: '' },
    assets: {} as any,
    policy_templates: [
      {
        name: 'simple',
        title: 'Simple template',
        description: 'Simple single-input template',
        inputs: [
          {
            type: 'logfile',
            title: 'Collect logs',
            description: 'Collect logs from instances',
          },
        ],
        multiple: true,
      },
    ],
    data_streams: [
      {
        type: 'logs',
        dataset: 'simple_pkg.logs',
        title: 'Simple logs',
        release: 'ga',
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
                default: ['/var/log/*.log'],
              },
            ],
            template_path: 'stream.yml.hbs',
            title: 'Simple logs',
            description: 'Collect simple logs',
            enabled: true,
          },
        ],
        package: 'simple_pkg',
        path: 'logs',
      },
    ],
    latestVersion: '1.0.0',
    keepPoliciesUpToDate: false,
    status: 'not_installed',
  };

  const singleInputPackagePolicy: NewPackagePolicy = {
    name: 'simple-1',
    description: 'desc',
    namespace: 'default',
    policy_id: '',
    policy_ids: [''],
    enabled: true,
    supports_agentless: false,
    inputs: [
      {
        type: 'logfile',
        policy_template: 'simple',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: { type: 'logs', dataset: 'simple_pkg.logs' },
            vars: {
              paths: { value: ['/var/log/*.log'], type: 'text' },
            },
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    mockUpdatePackagePolicy.mockClear();
  });

  it('should render title without toggle switch when feature flag is on, single policy template, single input, and single stream', async () => {
    ExperimentalFeaturesService.init({
      ...allowedExperimentalValues,
      enableSimplifiedAgentlessUX: true,
    });

    const validationResults = validatePackagePolicy(
      singleInputPackagePolicy,
      singleInputPackageInfo,
      load
    );
    renderResult = testRenderer.render(
      <StepConfigurePackagePolicy
        packageInfo={singleInputPackageInfo}
        packagePolicy={singleInputPackagePolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={false}
      />
    );

    await waitFor(() => {
      expect(renderResult.getByTestId('PackagePolicy.InputStreamConfig.title')).toBeInTheDocument();
      expect(
        renderResult.queryByTestId('PackagePolicy.InputStreamConfig.Switch')
      ).not.toBeInTheDocument();
    });
  });

  it('should render toggle switch when feature flag is off', async () => {
    ExperimentalFeaturesService.init({
      ...allowedExperimentalValues,
      enableSimplifiedAgentlessUX: false,
    });

    const validationResults = validatePackagePolicy(
      singleInputPackagePolicy,
      singleInputPackageInfo,
      load
    );
    renderResult = testRenderer.render(
      <StepConfigurePackagePolicy
        packageInfo={singleInputPackageInfo}
        packagePolicy={singleInputPackagePolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={false}
      />
    );

    await waitFor(() => {
      expect(
        renderResult.getByTestId('PackagePolicy.InputStreamConfig.Switch')
      ).toBeInTheDocument();
    });
  });

  it('should render toggle switch when there are multiple inputs', async () => {
    ExperimentalFeaturesService.init({
      ...allowedExperimentalValues,
      enableSimplifiedAgentlessUX: true,
    });

    const multiInputPackageInfo: PackageInfo = {
      ...singleInputPackageInfo,
      policy_templates: [
        {
          name: 'multi',
          title: 'Multi input template',
          description: 'Template with multiple inputs',
          inputs: [
            {
              type: 'logfile',
              title: 'Collect logs',
              description: 'Collect logs from instances',
            },
            {
              type: 'httpjson',
              title: 'Collect via HTTP',
              description: 'Collect via HTTP endpoint',
            },
          ],
          multiple: true,
        },
      ],
      data_streams: [
        {
          type: 'logs',
          dataset: 'simple_pkg.logs',
          title: 'Simple logs',
          release: 'ga',
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
                  default: ['/var/log/*.log'],
                },
              ],
              template_path: 'stream.yml.hbs',
              title: 'Logs stream',
              description: 'Collect logs',
              enabled: true,
            },
          ],
          package: 'simple_pkg',
          path: 'logs',
        },
        {
          type: 'logs',
          dataset: 'simple_pkg.http',
          title: 'HTTP logs',
          release: 'ga',
          ingest_pipeline: 'default',
          streams: [
            {
              input: 'httpjson',
              vars: [
                {
                  name: 'url',
                  type: 'text',
                  title: 'URL',
                  required: true,
                  show_user: true,
                },
              ],
              template_path: 'stream.yml.hbs',
              title: 'HTTP stream',
              description: 'Collect via HTTP',
              enabled: true,
            },
          ],
          package: 'simple_pkg',
          path: 'http',
        },
      ],
    };

    const multiInputPolicy: NewPackagePolicy = {
      ...singleInputPackagePolicy,
      inputs: [
        {
          type: 'logfile',
          policy_template: 'multi',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'simple_pkg.logs' },
              vars: {
                paths: { value: ['/var/log/*.log'], type: 'text' },
              },
            },
          ],
        },
        {
          type: 'httpjson',
          policy_template: 'multi',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'simple_pkg.http' },
              vars: {
                url: { value: 'http://localhost', type: 'text' },
              },
            },
          ],
        },
      ],
    };

    const validationResults = validatePackagePolicy(multiInputPolicy, multiInputPackageInfo, load);
    renderResult = testRenderer.render(
      <StepConfigurePackagePolicy
        packageInfo={multiInputPackageInfo}
        packagePolicy={multiInputPolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={false}
      />
    );

    await waitFor(() => {
      const switches = renderResult.getAllByTestId('PackagePolicy.InputStreamConfig.Switch');
      expect(switches.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should render toggle switch when there are multiple policy templates', async () => {
    ExperimentalFeaturesService.init({
      ...allowedExperimentalValues,
      enableSimplifiedAgentlessUX: true,
    });

    const multiTemplatePackageInfo: PackageInfo = {
      ...singleInputPackageInfo,
      policy_templates: [
        {
          name: 'template_a',
          title: 'Template A',
          description: 'First template',
          inputs: [
            {
              type: 'logfile',
              title: 'Collect logs A',
              description: 'Collect logs from A',
            },
          ],
          multiple: true,
        },
        {
          name: 'template_b',
          title: 'Template B',
          description: 'Second template',
          inputs: [
            {
              type: 'httpjson',
              title: 'Collect logs B',
              description: 'Collect logs from B',
            },
          ],
          multiple: true,
        },
      ],
      data_streams: [
        ...singleInputPackageInfo.data_streams!,
        {
          type: 'logs',
          dataset: 'simple_pkg.http',
          title: 'HTTP logs',
          release: 'ga',
          ingest_pipeline: 'default',
          streams: [
            {
              input: 'httpjson',
              vars: [
                {
                  name: 'url',
                  type: 'text',
                  title: 'URL',
                  required: true,
                  show_user: true,
                },
              ],
              template_path: 'stream.yml.hbs',
              title: 'HTTP stream',
              description: 'Collect via HTTP',
              enabled: true,
            },
          ],
          package: 'simple_pkg',
          path: 'http',
        },
      ],
    };

    const multiTemplatePolicy: NewPackagePolicy = {
      ...singleInputPackagePolicy,
      inputs: [
        {
          type: 'logfile',
          policy_template: 'template_a',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'simple_pkg.logs' },
              vars: {
                paths: { value: ['/var/log/*.log'], type: 'text' },
              },
            },
          ],
        },
        {
          type: 'httpjson',
          policy_template: 'template_b',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'simple_pkg.http' },
              vars: {
                url: { value: 'http://localhost', type: 'text' },
              },
            },
          ],
        },
      ],
    };

    const validationResults = validatePackagePolicy(
      multiTemplatePolicy,
      multiTemplatePackageInfo,
      load
    );
    renderResult = testRenderer.render(
      <StepConfigurePackagePolicy
        packageInfo={multiTemplatePackageInfo}
        packagePolicy={multiTemplatePolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={false}
      />
    );

    await waitFor(() => {
      const switches = renderResult.getAllByTestId('PackagePolicy.InputStreamConfig.Switch');
      expect(switches.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should show deprecated policy template callout on edit page', async () => {
    ExperimentalFeaturesService.init({
      ...allowedExperimentalValues,
      enableSimplifiedAgentlessUX: true,
    });

    const deprecatedTemplatePackageInfo: PackageInfo = {
      ...singleInputPackageInfo,
      policy_templates: [
        {
          name: 'simple',
          title: 'Deprecated template',
          description: 'A deprecated template',
          inputs: [
            {
              type: 'logfile',
              title: 'Collect logs',
              description: 'Collect logs from instances',
            },
          ],
          multiple: true,
          deprecated: {
            description: 'This template is deprecated. Use the new template instead.',
          },
        },
      ],
    };

    const validationResults = validatePackagePolicy(
      singleInputPackagePolicy,
      deprecatedTemplatePackageInfo,
      load
    );
    renderResult = testRenderer.render(
      <StepConfigurePackagePolicy
        packageInfo={deprecatedTemplatePackageInfo}
        packagePolicy={singleInputPackagePolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={false}
        isEditPage={true}
      />
    );

    await waitFor(() => {
      expect(renderResult.getByTestId('deprecatedPolicyTemplateCallout')).toBeInTheDocument();
    });
  });
});

describe('isInputCompatibleWithVarGroupSelections', () => {
  // Basic Compatibility Tests
  it('should return true when input has no hide_in_var_group_options', () => {
    const input = { type: 'httpjson', title: 'Test Input' } as any;
    const selections = { credential_type: 'direct_access_key' };
    expect(isInputCompatibleWithVarGroupSelections(input, selections)).toBe(true);
  });

  it('should return true when hide_in_var_group_options is empty object', () => {
    const input = {
      type: 'httpjson',
      title: 'Test Input',
      hide_in_var_group_options: {},
    } as any;
    const selections = { credential_type: 'direct_access_key' };
    expect(isInputCompatibleWithVarGroupSelections(input, selections)).toBe(true);
  });

  // Selection Matching Tests
  it('should return true when selected option is NOT in the hidden list', () => {
    const input = {
      type: 'aws-s3',
      title: 'AWS S3 Input',
      hide_in_var_group_options: { credential_type: ['cloud_connectors'] },
    } as any;
    const selections = { credential_type: 'direct_access_key' };
    expect(isInputCompatibleWithVarGroupSelections(input, selections)).toBe(true);
  });

  it('should return false when selected option IS in the hidden list', () => {
    const input = {
      type: 'aws-s3',
      title: 'AWS S3 Input',
      hide_in_var_group_options: { credential_type: ['cloud_connectors'] },
    } as any;
    const selections = { credential_type: 'cloud_connectors' };
    expect(isInputCompatibleWithVarGroupSelections(input, selections)).toBe(false);
  });

  it('should return true when no selection exists for the var group', () => {
    const input = {
      type: 'aws-s3',
      title: 'AWS S3 Input',
      hide_in_var_group_options: { credential_type: ['cloud_connectors'] },
    } as any;
    const selections = {};
    expect(isInputCompatibleWithVarGroupSelections(input, selections)).toBe(true);
  });

  // Multiple Groups Tests
  it('should check all var groups and return false if ANY match', () => {
    const input = {
      type: 'test-input',
      title: 'Test Input',
      hide_in_var_group_options: {
        credential_type: ['cloud_connectors'],
        auth_method: ['oauth'],
      },
    } as any;
    // First group doesn't match, but second does
    const selections = { credential_type: 'direct_access_key', auth_method: 'oauth' };
    expect(isInputCompatibleWithVarGroupSelections(input, selections)).toBe(false);
  });

  it('should return true only when no groups have matching hidden options', () => {
    const input = {
      type: 'test-input',
      title: 'Test Input',
      hide_in_var_group_options: {
        credential_type: ['cloud_connectors'],
        auth_method: ['oauth'],
      },
    } as any;
    const selections = { credential_type: 'direct_access_key', auth_method: 'basic' };
    expect(isInputCompatibleWithVarGroupSelections(input, selections)).toBe(true);
  });

  // Multiple Hidden Options Tests
  it('should return false when selected option matches any item in the hidden array', () => {
    const input = {
      type: 'aws-s3',
      title: 'AWS S3 Input',
      hide_in_var_group_options: { credential_type: ['cloud_connectors', 'assume_role'] },
    } as any;
    const selections = { credential_type: 'assume_role' };
    expect(isInputCompatibleWithVarGroupSelections(input, selections)).toBe(false);
  });

  it('should return true when selected option does not match any item in array', () => {
    const input = {
      type: 'aws-s3',
      title: 'AWS S3 Input',
      hide_in_var_group_options: { credential_type: ['cloud_connectors', 'assume_role'] },
    } as any;
    const selections = { credential_type: 'direct_access_key' };
    expect(isInputCompatibleWithVarGroupSelections(input, selections)).toBe(true);
  });

  // Edge Cases
  it('should handle undefined selection for a group gracefully', () => {
    const input = {
      type: 'aws-s3',
      title: 'AWS S3 Input',
      hide_in_var_group_options: { credential_type: ['cloud_connectors'] },
    } as any;
    const selections = { other_group: 'some_value' };
    expect(isInputCompatibleWithVarGroupSelections(input, selections)).toBe(true);
  });
});

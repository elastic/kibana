/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';

import type { TestRenderer } from '../../../../../../../../mock';
import { useAgentless } from '../../../single_page_layout/hooks/setup_technology';

import type {
  PackageInfo,
  RegistryStreamWithDataStream,
  RegistryInput,
  NewPackagePolicyInput,
} from '../../../../../../types';
import { ExperimentalFeaturesService } from '../../../../../../services';
import {
  OTEL_COLLECTOR_INPUT_TYPE,
  DATA_STREAM_TYPE_VAR_NAME,
  USE_APM_VAR_NAME,
} from '../../../../../../../../../common/constants';

import { shouldShowStreamsByDefault, PackagePolicyInputPanel } from './package_policy_input_panel';

jest.mock('../../../single_page_layout/hooks/setup_technology', () => {
  return {
    useAgentless: jest.fn(),
  };
});

const useAgentlessMock = useAgentless as jest.MockedFunction<typeof useAgentless>;

const mockParse = () => ({});

describe('shouldShowStreamsByDefault', () => {
  it('should return true if a datastreamId is provided and contained in the input', () => {
    const res = shouldShowStreamsByDefault(
      mockParse,
      {} as any,
      [],
      {
        enabled: true,
        streams: [
          {
            id: 'datastream-id',
          },
        ],
      } as any,
      'datastream-id'
    );
    expect(res).toBeTruthy();
  });

  it('should return false if a datastreamId is provided but not contained in the input', () => {
    const res = shouldShowStreamsByDefault(
      mockParse,
      {} as any,
      [],
      {
        enabled: true,
        streams: [
          {
            id: 'datastream-1',
          },
        ],
      } as any,
      'datastream-id'
    );
    expect(res).toBeFalsy();
  });

  it('should return false if a datastreamId is provided but the input is disabled', () => {
    const res = shouldShowStreamsByDefault(
      mockParse,
      {} as any,
      [],
      {
        enabled: false,
        streams: [
          {
            id: 'datastream-id',
          },
        ],
      } as any,
      'datastream-id'
    );
    expect(res).toBeFalsy();
  });
});

describe('PackagePolicyInputPanel', () => {
  const mockPackageInfo = {
    name: 'agentless_test_package',
    version: '1.0.1-rc1',
    description: 'Test package with new agentless deployment modes',
    title: 'Agentless test package',
    format_version: '3.2.0',
    owner: {
      github: 'elastic/integrations',
      type: 'elastic',
    },
    type: 'integration',
    categories: ['custom'],
    screenshots: [],
    icons: [],
    policy_templates: [
      {
        name: 'sample',
        title: 'Agentless sample logs',
        description: 'Collect sample logs',
        multiple: true,
        inputs: [
          {
            title: 'Collect sample logs from instances',
            vars: [],
            type: 'logfile',
            description: 'Collecting sample logs',
          },
        ],
        deployment_modes: {
          default: {
            enabled: false,
          },
          agentless: {
            enabled: true,
          },
        },
      },
    ],
    data_streams: [
      {
        title: 'Default data stream',
        release: 'ga',
        type: 'logs',
        package: 'agentless_test_package',
        dataset: 'agentless_test_package.default_data_stream',
        path: 'default_data_stream',
        elasticsearch: {
          'ingest_pipeline.name': 'default',
        },
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            title: 'Sample logs hidden in agentless',
            template_path: 'stream.yml.hbs',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: false,
                default: ['/var/log/*.log'],
                required: false,
                show_user: true,
                hide_in_deployment_modes: ['agentless'],
              },
            ],
            description: 'Collect sample logs - hidden in agentless',
          },
        ],
      },
      {
        title: 'Logs Stream on Agentless',
        release: 'ga',
        type: 'logs',
        package: 'agentless_test_package',
        dataset: 'agentless_test_package.logs_stream',
        path: 'logs_stream',
        elasticsearch: {
          'ingest_pipeline.name': 'default',
        },
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            title: 'Sample logs on Agentless',
            template_path: 'stream.yml.hbs',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: true,
                default: ['/var/log/*.log'],
                required: false,
                show_user: true,
                hide_in_deployment_modes: ['default'],
              },
            ],
            description: 'Collect sample logs on Agentless only',
          },
        ],
      },
    ],
    readme: '/package/agentless_test_package/1.0.1-rc1/docs/README.md',
    release: 'beta',
    latestVersion: '1.0.1-rc1',
    assets: { kibana: {} },
    licensePath: '/package/agentless_test_package/1.0.1-rc1/LICENSE.txt',
    keepPoliciesUpToDate: false,
    status: 'installed',
    installationInfo: {},
  } as unknown as PackageInfo;

  const mockPackageInput: RegistryInput = {
    title: 'Collect sample logs from instances',
    vars: [],
    type: 'logfile',
    description: 'Collecting sample logs',
  };

  const mockPackageInputStreams: RegistryStreamWithDataStream[] = [
    {
      input: 'logfile',
      title: 'Sample logs hidden in agentless',
      template_path: 'stream.yml.hbs',
      vars: [
        {
          name: 'paths',
          type: 'text',
          title: 'Paths',
          multi: false,
          default: ['/var/log/*.log'],
          required: false,
          show_user: true,
          hide_in_deployment_modes: ['agentless'],
        },
      ],
      description: 'Collect sample logs - hidden in agentless',
      data_stream: {
        title: 'Default data stream',
        release: 'ga',
        type: 'logs',
        package: 'agentless_test_package',
        dataset: 'agentless_test_package.default_data_stream',
        path: 'default_data_stream',
        elasticsearch: {
          'ingest_pipeline.name': 'default',
        },
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            title: 'Sample logs hidden in agentless',
            template_path: 'stream.yml.hbs',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: false,
                default: ['/var/log/*.log'],
                required: false,
                show_user: true,
                hide_in_deployment_modes: ['agentless'],
              },
            ],
            description: 'Collect sample logs - hidden in agentless',
          },
        ],
      },
    },
    {
      input: 'logfile',
      title: 'Sample logs on Agentless',
      template_path: 'stream.yml.hbs',
      vars: [
        {
          name: 'paths',
          type: 'text',
          title: 'Paths',
          multi: true,
          default: ['/var/log/*.log'],
          required: false,
          show_user: true,
          hide_in_deployment_modes: ['default'],
        },
      ],
      description: 'Collect sample logs on Agentless only',
      data_stream: {
        title: 'Logs Stream on Agentless',
        release: 'ga',
        type: 'logs',
        package: 'agentless_test_package',
        dataset: 'agentless_test_package.logs_stream',
        path: 'logs_stream',
        elasticsearch: {
          'ingest_pipeline.name': 'default',
        },
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            title: 'Sample logs on Agentless',
            template_path: 'stream.yml.hbs',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: true,
                default: ['/var/log/*.log'],
                required: false,
                show_user: true,
                hide_in_deployment_modes: ['default'],
              },
            ],
            description: 'Collect sample logs on Agentless only',
          },
        ],
      },
    },
    // Duplicated items to make sure they show up in the UI as we now only show multiple switches/descriptions when theres more than one input
    {
      input: 'logfile',
      title: 'Sample logs hidden in agentless (duplicated)',
      template_path: 'stream.yml.hbs',
      vars: [
        {
          name: 'paths',
          type: 'text',
          title: 'Paths',
          multi: false,
          default: ['/var/log/*.log'],
          required: false,
          show_user: true,
          hide_in_deployment_modes: ['agentless'],
        },
      ],
      description: 'Collect sample logs - hidden in agentless',
      data_stream: {
        title: 'Default data stream',
        release: 'ga',
        type: 'logs',
        package: 'agentless_test_package',
        dataset: 'agentless_test_package.default_data_stream',
        path: 'default_data_stream',
        elasticsearch: {
          'ingest_pipeline.name': 'default',
        },
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            title: 'Sample logs hidden in agentless',
            template_path: 'stream.yml.hbs',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: false,
                default: ['/var/log/*.log'],
                required: false,
                show_user: true,
                hide_in_deployment_modes: ['agentless'],
              },
            ],
            description: 'Collect sample logs - hidden in agentless',
          },
        ],
      },
    },
    {
      input: 'logfile',
      title: 'Sample logs on Agentless (duplicated)',
      template_path: 'stream.yml.hbs',
      vars: [
        {
          name: 'paths',
          type: 'text',
          title: 'Paths',
          multi: true,
          default: ['/var/log/*.log'],
          required: false,
          show_user: true,
          hide_in_deployment_modes: ['default'],
        },
      ],
      description: 'Collect sample logs on Agentless only',
      data_stream: {
        title: 'Logs Stream on Agentless',
        release: 'ga',
        type: 'logs',
        package: 'agentless_test_package',
        dataset: 'agentless_test_package.logs_stream',
        path: 'logs_stream',
        elasticsearch: {
          'ingest_pipeline.name': 'default',
        },
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            title: 'Sample logs on Agentless',
            template_path: 'stream.yml.hbs',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: true,
                default: ['/var/log/*.log'],
                required: false,
                show_user: true,
                hide_in_deployment_modes: ['default'],
              },
            ],
            description: 'Collect sample logs on Agentless only',
          },
        ],
      },
    },
  ];
  const mockUpdatePackagePolicyInput = jest.fn().mockImplementation((val: any) => {
    return undefined;
  });
  const inputValidationResults = {
    streams: {
      'agentless_test_package.default_data_stream': { vars: { paths: null } },
      'agentless_test_package.logs_stream': { vars: { paths: null } },
    },
  };

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const packagePolicyInput = {
    id: 'input-1',
    type: 'logfile',
    policy_template: 'sample',
    enabled: true,
    streams: [
      {
        data_stream: { type: 'logs', dataset: 'agentless_test_package.default_data_stream' },
        enabled: true,
        vars: { paths: [] },
      },
      {
        data_stream: { type: 'logs', dataset: 'agentless_test_package.logs_stream' },
        enabled: true,
        vars: { paths: [] },
      },
    ],
  } as NewPackagePolicyInput;
  const render = (
    packageInfo: PackageInfo,
    packageInputStreams: RegistryStreamWithDataStream[]
  ) => {
    renderResult = testRenderer.render(
      <PackagePolicyInputPanel
        packageInfo={packageInfo}
        packageInput={mockPackageInput}
        packageInputStreams={packageInputStreams}
        packagePolicyInput={packagePolicyInput}
        updatePackagePolicyInput={mockUpdatePackagePolicyInput}
        inputValidationResults={inputValidationResults}
      />
    );
  };
  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  describe('When agentless is enabled', () => {
    beforeEach(() => {
      useAgentlessMock.mockReturnValue({
        isAgentlessEnabled: true,
        isAgentlessDefault: false,
        isAgentlessAgentPolicy: jest.fn(),
        getAgentlessStatusForPackage: jest
          .fn()
          .mockReturnValue({ isAgentless: false, isDefaultDeploymentMode: false }),
        isServerless: false,
        isCloud: true,
      });
    });

    it('should render inputs specific to env', async () => {
      render(mockPackageInfo, mockPackageInputStreams);
      await waitFor(async () => {
        expect(
          await renderResult.findByTestId('PackagePolicy.InputStreamConfig.Switch')
        ).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(
          await renderResult.findByText('Collect sample logs from instances')
        ).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(await renderResult.findByText('Sample logs on Agentless')).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(
          await renderResult.queryByText('Sample logs hidden in agentless')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('When agentless not enabled', () => {
    beforeEach(() => {
      useAgentlessMock.mockReturnValue({
        isAgentlessEnabled: false,
        isAgentlessDefault: false,
        isAgentlessAgentPolicy: jest.fn(),
        getAgentlessStatusForPackage: jest
          .fn()
          .mockReturnValue({ isAgentless: false, isDefaultDeploymentMode: false }),
        isServerless: false,
        isCloud: false,
      });
    });

    it('should render inputs specific to the env', async () => {
      render(mockPackageInfo, mockPackageInputStreams);
      await waitFor(async () => {
        expect(
          await renderResult.findByTestId('PackagePolicy.InputStreamConfig.Switch')
        ).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(
          await renderResult.findByText('Collect sample logs from instances')
        ).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(await renderResult.queryByText('Sample logs on Agentless')).not.toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(
          await renderResult.queryByText('Sample logs hidden in agentless')
        ).toBeInTheDocument();
      });
    });
    it('should not render multiple toggles when theres only one stream', async () => {
      //  Only send one input and then it should not be rendered, only the top level switch should render
      render(mockPackageInfo, mockPackageInputStreams.slice(0, 1));
      await waitFor(async () => {
        expect(
          await renderResult.findByTestId('PackagePolicy.InputStreamConfig.Switch')
        ).toBeInTheDocument();
        expect(
          await renderResult.queryByText('Sample logs hidden in agentless')
        ).not.toBeInTheDocument();
      });
    });

    it('should show deprecation icon when input is deprecated on edit page', async () => {
      const deprecatedInput: RegistryInput = {
        title: 'Deprecated Input',
        vars: [],
        type: 'logfile',
        description: 'This is deprecated',
        deprecated: {
          description: 'This input is deprecated. Use CEL input instead.',
        },
      };
      const simpleStreams: RegistryStreamWithDataStream[] = [
        {
          input: 'logfile',
          title: 'Stream 1',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              required: false,
              show_user: true,
            },
          ],
          description: 'Test stream',
          data_stream: {
            ...mockPackageInputStreams[0].data_stream,
          },
        },
        {
          input: 'logfile',
          title: 'Stream 2',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              required: false,
              show_user: true,
            },
          ],
          description: 'Test stream 2',
          data_stream: {
            ...mockPackageInputStreams[1].data_stream,
          },
        },
      ];
      const deprecatedPolicyInput = {
        ...packagePolicyInput,
        deprecated: {
          description: 'This input is deprecated. Use CEL input instead.',
        },
      };
      renderResult = testRenderer.render(
        <PackagePolicyInputPanel
          packageInfo={mockPackageInfo}
          packageInput={deprecatedInput}
          packageInputStreams={simpleStreams}
          packagePolicyInput={deprecatedPolicyInput}
          updatePackagePolicyInput={mockUpdatePackagePolicyInput}
          inputValidationResults={inputValidationResults}
          isEditPage={true}
        />
      );
      await waitFor(() => {
        expect(
          renderResult.getByTestId('PackagePolicy.InputStreamConfig.deprecatedIcon')
        ).toBeInTheDocument();
      });
    });

    it('should not show deprecation icon when input is not deprecated', async () => {
      render(mockPackageInfo, mockPackageInputStreams);
      await waitFor(() => {
        expect(
          renderResult.queryByTestId('PackagePolicy.InputStreamConfig.deprecatedIcon')
        ).not.toBeInTheDocument();
      });
    });

    it('should hide input on new installation when all streams are deprecated', async () => {
      const deprecatedStreams: RegistryStreamWithDataStream[] = [
        {
          input: 'logfile',
          title: 'Stream 1',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              required: false,
              show_user: true,
            },
          ],
          description: 'Test stream',
          deprecated: {
            description: 'This stream is deprecated.',
          },
          data_stream: {
            ...mockPackageInputStreams[0].data_stream,
          },
        },
        {
          input: 'logfile',
          title: 'Stream 2',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              required: false,
              show_user: true,
            },
          ],
          description: 'Test stream 2',
          deprecated: {
            description: 'This stream is also deprecated.',
          },
          data_stream: {
            ...mockPackageInputStreams[1].data_stream,
          },
        },
      ];
      renderResult = testRenderer.render(
        <PackagePolicyInputPanel
          packageInfo={mockPackageInfo}
          packageInput={mockPackageInput}
          packageInputStreams={deprecatedStreams}
          packagePolicyInput={packagePolicyInput}
          updatePackagePolicyInput={mockUpdatePackagePolicyInput}
          inputValidationResults={inputValidationResults}
          isEditPage={false}
        />
      );
      expect(
        renderResult.queryByTestId('PackagePolicy.InputStreamConfig.Switch')
      ).not.toBeInTheDocument();
    });

    it('should show input on edit page when all streams are deprecated', async () => {
      const deprecatedStreams: RegistryStreamWithDataStream[] = [
        {
          input: 'logfile',
          title: 'Stream 1',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              required: false,
              show_user: true,
            },
          ],
          description: 'Test stream',
          deprecated: {
            description: 'This stream is deprecated.',
          },
          data_stream: {
            ...mockPackageInputStreams[0].data_stream,
          },
        },
        {
          input: 'logfile',
          title: 'Stream 2',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              required: false,
              show_user: true,
            },
          ],
          description: 'Test stream 2',
          deprecated: {
            description: 'This stream is also deprecated.',
          },
          data_stream: {
            ...mockPackageInputStreams[1].data_stream,
          },
        },
      ];
      renderResult = testRenderer.render(
        <PackagePolicyInputPanel
          packageInfo={mockPackageInfo}
          packageInput={mockPackageInput}
          packageInputStreams={deprecatedStreams}
          packagePolicyInput={packagePolicyInput}
          updatePackagePolicyInput={mockUpdatePackagePolicyInput}
          inputValidationResults={inputValidationResults}
          isEditPage={true}
        />
      );
      await waitFor(() => {
        expect(
          renderResult.getByTestId('PackagePolicy.InputStreamConfig.deprecatedIcon')
        ).toBeInTheDocument();
      });
    });

    it('should render title without toggle switch when isSingleInputAndStreams is true', async () => {
      const simpleStreams: RegistryStreamWithDataStream[] = [
        {
          input: 'logfile',
          title: 'Stream 1',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              required: false,
              show_user: true,
            },
          ],
          description: 'Test stream',
          data_stream: {
            ...mockPackageInputStreams[0].data_stream,
          },
        },
        {
          input: 'logfile',
          title: 'Stream 2',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              required: false,
              show_user: true,
            },
          ],
          description: 'Test stream 2',
          data_stream: {
            ...mockPackageInputStreams[1].data_stream,
          },
        },
      ];
      renderResult = testRenderer.render(
        <PackagePolicyInputPanel
          packageInfo={mockPackageInfo}
          packageInput={mockPackageInput}
          packageInputStreams={simpleStreams}
          packagePolicyInput={packagePolicyInput}
          updatePackagePolicyInput={mockUpdatePackagePolicyInput}
          inputValidationResults={inputValidationResults}
          isSingleInputAndStreams={true}
        />
      );
      await waitFor(() => {
        expect(
          renderResult.getByTestId('PackagePolicy.InputStreamConfig.title')
        ).toBeInTheDocument();
        expect(
          renderResult.queryByTestId('PackagePolicy.InputStreamConfig.Switch')
        ).not.toBeInTheDocument();
      });
    });

    it('should render toggle switch when isSingleInputAndStreams is false', async () => {
      const simpleStreams: RegistryStreamWithDataStream[] = [
        {
          input: 'logfile',
          title: 'Stream 1',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              required: false,
              show_user: true,
            },
          ],
          description: 'Test stream',
          data_stream: {
            ...mockPackageInputStreams[0].data_stream,
          },
        },
        {
          input: 'logfile',
          title: 'Stream 2',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              required: false,
              show_user: true,
            },
          ],
          description: 'Test stream 2',
          data_stream: {
            ...mockPackageInputStreams[1].data_stream,
          },
        },
      ];
      renderResult = testRenderer.render(
        <PackagePolicyInputPanel
          packageInfo={mockPackageInfo}
          packageInput={mockPackageInput}
          packageInputStreams={simpleStreams}
          packagePolicyInput={packagePolicyInput}
          updatePackagePolicyInput={mockUpdatePackagePolicyInput}
          inputValidationResults={inputValidationResults}
          isSingleInputAndStreams={false}
        />
      );
      await waitFor(() => {
        expect(
          renderResult.getByTestId('PackagePolicy.InputStreamConfig.Switch')
        ).toBeInTheDocument();
      });
    });

    it('should render inputs when hide_in_deployment_modes is not present', async () => {
      const packageInputStreams: RegistryStreamWithDataStream[] = [
        {
          input: 'logfile',
          title: 'Sample logs',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              default: ['/var/log/*.log'],
              required: false,
              show_user: true,
            },
          ],
          description: 'Collect sample logs',
          data_stream: {
            title: 'Default data stream',
            release: 'ga',
            type: 'logs',
            package: 'agentless_test_package',
            dataset: 'agentless_test_package.default_data_stream',
            path: 'default_data_stream',
            elasticsearch: {
              'ingest_pipeline.name': 'default',
            },
            ingest_pipeline: 'default',
            streams: [
              {
                input: 'logfile',
                title: 'Sample logs',
                template_path: 'stream.yml.hbs',
                vars: [
                  {
                    name: 'paths',
                    type: 'text',
                    title: 'Paths',
                    multi: false,
                    default: ['/var/log/*.log'],
                    required: false,
                    show_user: true,
                  },
                ],
                description: 'Collect sample log - hidden in agentless',
              },
            ],
          },
        },
        //  Duplicated items to make sure they show up in the UI as we now only show multiple switches/descriptions when theres more than one input
        {
          input: 'logfile',
          title: 'Sample logs (duplicated)',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              default: ['/var/log/*.log'],
              required: false,
              show_user: true,
            },
          ],
          description: 'Collect sample logs (duplicated)',
          data_stream: {
            title: 'Default data stream',
            release: 'ga',
            type: 'logs',
            package: 'agentless_test_package',
            dataset: 'agentless_test_package.default_data_stream',
            path: 'default_data_stream',
            elasticsearch: {
              'ingest_pipeline.name': 'default',
            },
            ingest_pipeline: 'default',
            streams: [
              {
                input: 'logfile',
                title: 'Sample logs',
                template_path: 'stream.yml.hbs',
                vars: [
                  {
                    name: 'paths',
                    type: 'text',
                    title: 'Paths',
                    multi: false,
                    default: ['/var/log/*.log'],
                    required: false,
                    show_user: true,
                  },
                ],
                description: 'Collect sample log - hidden in agentless',
              },
            ],
          },
        },
      ];
      const packageInfo = {
        ...mockPackageInfo,
        data_streams: [
          {
            title: 'Default data stream',
            release: 'ga',
            type: 'logs',
            package: 'agentless_test_package',
            dataset: 'agentless_test_package.default_data_stream',
            path: 'default_data_stream',
            elasticsearch: {
              'ingest_pipeline.name': 'default',
            },
            ingest_pipeline: 'default',
            streams: [
              {
                input: 'logfile',
                title: 'Sample logs',
                template_path: 'stream.yml.hbs',
                vars: [
                  {
                    name: 'paths',
                    type: 'text',
                    title: 'Paths',
                    multi: false,
                    default: ['/var/log/*.log'],
                    required: false,
                    show_user: true,
                  },
                ],
                description: 'Collect sample logs',
              },
            ],
          },
        ],
      } as unknown as PackageInfo;
      render(packageInfo, packageInputStreams);

      await waitFor(async () => {
        expect(
          await renderResult.findByText('Collect sample logs from instances')
        ).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(await renderResult.queryByText('Sample logs')).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(await renderResult.findByText('Collect sample logs')).toBeInTheDocument();
      });
    });
  });

  describe('For single input and streams', () => {
    beforeEach(() => {
      useAgentlessMock.mockReturnValue({
        isAgentlessEnabled: false,
        isAgentlessDefault: false,
        isAgentlessAgentPolicy: jest.fn(),
        getAgentlessStatusForPackage: jest
          .fn()
          .mockReturnValue({ isAgentless: false, isDefaultDeploymentMode: false }),
        isServerless: false,
        isCloud: false,
      });
    });

    const singleStream: RegistryStreamWithDataStream[] = [
      {
        input: 'logfile',
        title: 'Stream 1',
        template_path: 'stream.yml.hbs',
        vars: [
          {
            name: 'paths',
            type: 'text',
            title: 'Paths',
            multi: false,
            required: false,
            show_user: true,
          },
        ],
        description: 'Test stream',
        data_stream: {
          ...mockPackageInputStreams[0].data_stream,
        },
      },
    ];

    const singleStreamPolicyInput = {
      ...packagePolicyInput,
      streams: [packagePolicyInput.streams[0]],
    } as NewPackagePolicyInput;

    it('should render title without toggle switch when isSingleInputAndStreams is true', async () => {
      renderResult = testRenderer.render(
        <PackagePolicyInputPanel
          packageInfo={mockPackageInfo}
          packageInput={mockPackageInput}
          packageInputStreams={singleStream}
          packagePolicyInput={singleStreamPolicyInput}
          updatePackagePolicyInput={mockUpdatePackagePolicyInput}
          inputValidationResults={inputValidationResults}
          isSingleInputAndStreams={true}
        />
      );
      await waitFor(() => {
        expect(
          renderResult.getByTestId('PackagePolicy.InputStreamConfig.title')
        ).toBeInTheDocument();
        expect(
          renderResult.queryByTestId('PackagePolicy.InputStreamConfig.Switch')
        ).not.toBeInTheDocument();
      });
    });

    it('should consolidate advanced sections when all stream vars are advanced', async () => {
      const advancedOnlyStream: RegistryStreamWithDataStream[] = [
        {
          input: 'logfile',
          title: 'Stream 1',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'processors',
              type: 'yaml',
              title: 'Processors',
              multi: false,
              required: false,
              show_user: false,
            },
          ],
          description: 'Test stream with only advanced vars',
          data_stream: {
            ...mockPackageInputStreams[0].data_stream,
          },
        },
      ];

      const inputWithVars: RegistryInput = {
        ...mockPackageInput,
        vars: [
          {
            name: 'api_key',
            type: 'text',
            title: 'API Key',
            required: true,
            show_user: true,
          },
        ],
      };

      renderResult = testRenderer.render(
        <PackagePolicyInputPanel
          packageInfo={mockPackageInfo}
          packageInput={inputWithVars}
          packageInputStreams={advancedOnlyStream}
          packagePolicyInput={singleStreamPolicyInput}
          updatePackagePolicyInput={mockUpdatePackagePolicyInput}
          inputValidationResults={inputValidationResults}
          isSingleInputAndStreams={true}
        />
      );
      await waitFor(() => {
        expect(
          renderResult.queryByTestId('PackagePolicy.InputConfig.streams')
        ).not.toBeInTheDocument();
      });

      fireEvent.click(renderResult.getByText('Advanced options'));

      await waitFor(() => {
        expect(renderResult.getByText('Processors')).toBeInTheDocument();
      });
    });
  });

  describe('applyUseAPMVar for OTel input', () => {
    const otelPackageInfo = {
      name: 'my_otel',
      version: '1.0.0',
      type: 'input',
      title: 'My OTel Package',
      description: 'OTel package',
      format_version: '3.0.0',
      owner: { github: 'elastic/integrations', type: 'elastic' },
      categories: ['custom'],
      policy_templates: [
        {
          name: 'otel_template',
          title: 'OTel Template',
          description: 'OTel',
          input: OTEL_COLLECTOR_INPUT_TYPE,
          type: 'logs',
          template_path: 'input.yml.hbs',
          dynamic_signal_types: false,
          vars: [],
        },
      ],
      data_streams: [],
      assets: { kibana: {} },
      status: 'installed',
      release: 'ga',
      latestVersion: '1.0.0',
      keepPoliciesUpToDate: false,
      installationInfo: {},
    } as unknown as PackageInfo;

    const otelPackageInput: RegistryInput = {
      type: OTEL_COLLECTOR_INPUT_TYPE,
      title: 'OTel Collector',
      vars: [],
      description: 'Collect telemetry',
    };

    const otelPackageInputStreams: RegistryStreamWithDataStream[] = [
      {
        input: OTEL_COLLECTOR_INPUT_TYPE,
        title: 'OTel stream',
        vars: [
          {
            name: 'dataset',
            type: 'text',
            title: 'Dataset name',
            show_user: true,
            multi: false,
            required: true,
          },
        ],
        description: 'OTel stream',
        data_stream: {
          title: 'OTel Data',
          release: 'ga',
          type: 'logs',
          package: 'my_otel',
          dataset: 'my_otel.data',
          path: 'data',
          elasticsearch: {},
          ingest_pipeline: 'default',
          streams: [],
        },
      },
    ];

    const otelInputValidationResults = {
      streams: { 'my_otel.data': { vars: {} } },
    };

    let mockUpdateOtelInput: jest.Mock;

    beforeEach(() => {
      jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({
        enableVarGroups: true,
      } as any);
      useAgentlessMock.mockReturnValue({
        isAgentlessEnabled: false,
        isAgentlessDefault: false,
        isAgentlessAgentPolicy: jest.fn(),
        getAgentlessStatusForPackage: jest
          .fn()
          .mockReturnValue({ isAgentless: false, isDefaultDeploymentMode: false }),
        isServerless: false,
        isCloud: false,
      });
      mockUpdateOtelInput = jest.fn();
    });

    it('adds use_apm var by default when data_stream.type changes to traces', async () => {
      const otelPolicyInput = {
        id: 'input-1',
        type: OTEL_COLLECTOR_INPUT_TYPE,
        policy_template: 'otel_template',
        enabled: true,
        streams: [
          {
            id: 'otel-stream-1',
            data_stream: { type: 'logs', dataset: 'my_otel.data' },
            enabled: true,
            vars: {
              [DATA_STREAM_TYPE_VAR_NAME]: { type: 'string', value: 'logs' },
            },
          },
        ],
      } as NewPackagePolicyInput;

      renderResult = testRenderer.render(
        <PackagePolicyInputPanel
          packageInfo={otelPackageInfo}
          packageInput={otelPackageInput}
          packageInputStreams={otelPackageInputStreams}
          packagePolicyInput={otelPolicyInput}
          updatePackagePolicyInput={mockUpdateOtelInput}
          inputValidationResults={otelInputValidationResults}
        />
      );

      const advancedToggle = await renderResult.findByTestId(
        'advancedStreamOptionsToggle-otel-stream-1'
      );
      fireEvent.click(advancedToggle);

      await waitFor(() => {
        expect(renderResult.getByTestId('packagePolicyDataStreamType')).toBeInTheDocument();
      });

      fireEvent.click(renderResult.getByRole('radio', { name: 'Traces' }));

      await waitFor(() => {
        expect(mockUpdateOtelInput).toHaveBeenCalledWith(
          expect.objectContaining({
            streams: expect.arrayContaining([
              expect.objectContaining({
                vars: expect.objectContaining({
                  [USE_APM_VAR_NAME]: expect.objectContaining({ value: true }),
                }),
              }),
            ]),
          })
        );
      });
    });

    it('removes use_apm var when data_stream.type changes away from traces', async () => {
      const otelPolicyInputWithTraces = {
        id: 'input-1',
        type: OTEL_COLLECTOR_INPUT_TYPE,
        policy_template: 'otel_template',
        enabled: true,
        streams: [
          {
            id: 'otel-stream-1',
            data_stream: { type: 'traces', dataset: 'my_otel.data' },
            enabled: true,
            vars: {
              [DATA_STREAM_TYPE_VAR_NAME]: { type: 'string', value: 'traces' },
              [USE_APM_VAR_NAME]: { type: 'bool', value: true },
            },
          },
        ],
      } as NewPackagePolicyInput;

      renderResult = testRenderer.render(
        <PackagePolicyInputPanel
          packageInfo={otelPackageInfo}
          packageInput={otelPackageInput}
          packageInputStreams={otelPackageInputStreams}
          packagePolicyInput={otelPolicyInputWithTraces}
          updatePackagePolicyInput={mockUpdateOtelInput}
          inputValidationResults={otelInputValidationResults}
        />
      );

      const advancedToggle = await renderResult.findByTestId(
        'advancedStreamOptionsToggle-otel-stream-1'
      );
      fireEvent.click(advancedToggle);

      await waitFor(() => {
        expect(renderResult.getByTestId('packagePolicyDataStreamType')).toBeInTheDocument();
      });

      fireEvent.click(renderResult.getByRole('radio', { name: 'Logs' }));

      await waitFor(() => {
        const lastCall = mockUpdateOtelInput.mock.lastCall?.[0];
        expect(lastCall?.streams?.[0]?.vars).not.toHaveProperty(USE_APM_VAR_NAME);
      });
    });
  });
});

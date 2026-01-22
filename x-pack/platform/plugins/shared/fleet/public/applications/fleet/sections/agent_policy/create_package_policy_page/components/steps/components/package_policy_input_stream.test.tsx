/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';

import type { TestRenderer } from '../../../../../../../../mock';
import type {
  PackageInfo,
  NewPackagePolicyInputStream,
  RegistryStreamWithDataStream,
} from '../../../../../../types';

import { PackagePolicyInputStreamConfig } from './package_policy_input_stream';

jest.mock('../../../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../../../hooks'),
  useStartServices: () => ({
    docLinks: {
      links: {
        fleet: {
          datastreamsNamingScheme: 'https://docs.elastic.co',
        },
      },
    },
  }),
  sendGetDataStreams: jest.fn(),
}));

jest.mock('../../datastream_hooks', () => ({
  useIndexTemplateExists: () => ({
    exists: true,
    isLoading: false,
  }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({
    params: {},
  }),
}));

describe('PackagePolicyInputStreamConfig', () => {
  const mockPackageInfo: PackageInfo = {
    name: 'test-package',
    version: '1.0.0',
    title: 'Test Package',
    description: 'Test package description',
    type: 'input',
    policy_templates: [
      {
        name: 'test-template',
        title: 'Test Template',
        input: 'otelcol',
        type: 'logs',
        template_path: 'input.yml.hbs',
        vars: [],
      },
    ],
  } as any;

  const mockPackageInputStream: RegistryStreamWithDataStream = {
    data_stream: {
      type: 'logs',
      dataset: 'test-package.test-template',
    },
    vars: [],
  } as any;

  const mockPackagePolicyInputStream: NewPackagePolicyInputStream = {
    id: 'test-stream-id',
    enabled: true,
    data_stream: {
      type: 'logs',
      dataset: 'test-package.test-template',
    },
    vars: {},
  };

  const mockUpdatePackagePolicyInputStream = jest.fn();
  const mockInputStreamValidationResults = {};

  const defaultProps = {
    packageInputStream: mockPackageInputStream,
    packageInfo: mockPackageInfo,
    packagePolicyInputStream: mockPackagePolicyInputStream,
    updatePackagePolicyInputStream: mockUpdatePackagePolicyInputStream,
    inputStreamValidationResults: mockInputStreamValidationResults,
    forceShowErrors: false,
    isEditPage: false,
    totalStreams: 1,
  };

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    renderResult = testRenderer.render(
      <PackagePolicyInputStreamConfig {...defaultProps} {...props} />
    );
    return renderResult;
  };

  it('should render data stream type selector for input packages', async () => {
    renderComponent();

    // Click advanced options to show the selector
    const advancedToggle = await renderResult.findByTestId(
      'advancedStreamOptionsToggle-test-stream-id'
    );
    advancedToggle.click();

    await waitFor(async () => {
      const radioGroup = await renderResult.findByTestId('packagePolicyDataStreamType');
      expect(radioGroup).toBeInTheDocument();
    });
  });

  it('should show all three options (logs, metrics, traces) when available_types is not defined', async () => {
    renderComponent();

    const advancedToggle = await renderResult.findByTestId(
      'advancedStreamOptionsToggle-test-stream-id'
    );
    advancedToggle.click();

    await waitFor(async () => {
      expect(await renderResult.findByLabelText('Logs')).toBeInTheDocument();
      expect(await renderResult.findByLabelText('Metrics')).toBeInTheDocument();
      expect(await renderResult.findByLabelText('Traces')).toBeInTheDocument();
    });
  });

  it('should show only specified options when available_types is defined in policy_template', async () => {
    const packageInfoWithAvailableTypes: PackageInfo = {
      ...mockPackageInfo,
      policy_templates: [
        {
          name: 'test-template',
          title: 'Test Template',
          input: 'otelcol',
          type: 'logs',
          available_types: ['logs', 'metrics'],
          template_path: 'input.yml.hbs',
          vars: [],
        },
      ],
    } as any;

    renderComponent({ packageInfo: packageInfoWithAvailableTypes });

    const advancedToggle = await renderResult.findByTestId(
      'advancedStreamOptionsToggle-test-stream-id'
    );
    advancedToggle.click();

    await waitFor(async () => {
      expect(await renderResult.findByLabelText('Logs')).toBeInTheDocument();
      expect(await renderResult.findByLabelText('Metrics')).toBeInTheDocument();
      expect(renderResult.queryByLabelText('Traces')).not.toBeInTheDocument();
    });
  });

  it('should show all three signal types when available_types includes all three', async () => {
    const packageInfoWithAllTypes: PackageInfo = {
      ...mockPackageInfo,
      policy_templates: [
        {
          name: 'test-template',
          title: 'Test Template',
          input: 'otelcol',
          type: 'logs',
          available_types: ['logs', 'metrics', 'traces'],
          template_path: 'input.yml.hbs',
          vars: [],
        },
      ],
    } as any;

    renderComponent({ packageInfo: packageInfoWithAllTypes });

    const advancedToggle = await renderResult.findByTestId(
      'advancedStreamOptionsToggle-test-stream-id'
    );
    advancedToggle.click();

    await waitFor(async () => {
      expect(await renderResult.findByLabelText('Logs')).toBeInTheDocument();
      expect(await renderResult.findByLabelText('Metrics')).toBeInTheDocument();
      expect(await renderResult.findByLabelText('Traces')).toBeInTheDocument();
    });
  });

  it('should default to first available type when available_types is defined', async () => {
    const packageInfoWithAvailableTypes: PackageInfo = {
      ...mockPackageInfo,
      policy_templates: [
        {
          name: 'test-template',
          title: 'Test Template',
          input: 'otelcol',
          type: 'logs',
          available_types: ['metrics', 'logs'],
          template_path: 'input.yml.hbs',
          vars: [],
        },
      ],
    } as any;

    renderComponent({
      packageInfo: packageInfoWithAvailableTypes,
      packagePolicyInputStream: {
        ...mockPackagePolicyInputStream,
        data_stream: {
          ...mockPackagePolicyInputStream.data_stream,
          type: undefined as any,
        },
        vars: {},
      },
    });

    const advancedToggle = await renderResult.findByTestId(
      'advancedStreamOptionsToggle-test-stream-id'
    );
    advancedToggle.click();

    await waitFor(async () => {
      // Should default to first available type (metrics)
      const metricsRadio = await renderResult.findByLabelText('Metrics');
      expect(metricsRadio).toBeChecked();
    });
  });

  it('should call updatePackagePolicyInputStream when data stream type is changed', async () => {
    renderComponent();

    const advancedToggle = await renderResult.findByTestId(
      'advancedStreamOptionsToggle-test-stream-id'
    );
    advancedToggle.click();

    await waitFor(async () => {
      const metricsOption = await renderResult.findByLabelText('Metrics');
      metricsOption.click();
    });

    expect(mockUpdatePackagePolicyInputStream).toHaveBeenCalledWith({
      vars: {
        'data_stream.type': {
          type: 'string',
          value: 'metrics',
        },
      },
    });
  });

  it('should disable data stream type selector on edit page', async () => {
    renderComponent({ isEditPage: true });

    const advancedToggle = await renderResult.findByTestId(
      'advancedStreamOptionsToggle-test-stream-id'
    );
    advancedToggle.click();

    await waitFor(async () => {
      const logsRadio = await renderResult.findByLabelText('Logs');
      expect(logsRadio).toBeDisabled();
    });
  });

  it('should not show data stream type selector for non-input packages', async () => {
    const integrationPackageInfo: PackageInfo = {
      ...mockPackageInfo,
      type: 'integration',
    } as any;

    renderComponent({ packageInfo: integrationPackageInfo });

    // For non-input packages, the advanced toggle might not be rendered if there are no advanced options
    // But if it is rendered, clicking it should not show the data stream type selector
    const advancedToggle = renderResult.queryByTestId('advancedStreamOptionsToggle-test-stream-id');

    if (advancedToggle) {
      advancedToggle.click();
      await waitFor(() => {
        expect(renderResult.queryByTestId('packagePolicyDataStreamType')).not.toBeInTheDocument();
      });
    } else {
      // If toggle doesn't exist, verify the selector is also not in the document
      expect(renderResult.queryByTestId('packagePolicyDataStreamType')).not.toBeInTheDocument();
    }
  });
});

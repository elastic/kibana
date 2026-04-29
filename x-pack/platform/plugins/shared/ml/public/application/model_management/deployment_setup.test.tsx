/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import type { CloudInfo } from '@kbn/ml-common-types/ml_server_info';
import type { DeploymentParamsMapper } from './deployment_params_mapper';
import {
  DeploymentSetup,
  RERANK_WARNING_DESCRIPTION,
  RERANK_WARNING_SERVERLESS_DESCRIPTION,
  type DeploymentParamsUI,
} from './deployment_setup';

const cloudInfo: CloudInfo = {
  cloudId: null,
  isCloud: false,
  isCloudTrial: false,
  deploymentId: null,
  cloudUrl: null,
  isMlAutoscalingEnabled: false,
};

const deploymentParamsMapper = {
  getVCPURange: () => ({ min: 1, max: 7, static: 4, maxThreads: 8 }),
  getVCURange: () => ({ min: 8, max: 56, static: 32 }),
} as unknown as DeploymentParamsMapper;

const baseConfig: DeploymentParamsUI = {
  deploymentId: '.rerank-v1_search',
  optimized: 'optimizedForSearch',
  adaptiveResources: true,
  vCPUUsage: 'medium',
};

function renderDeploymentSetup(props: {
  isSearchOnly?: boolean;
  showNodeInfo?: boolean;
  config?: DeploymentParamsUI;
  onConfigChange?: (c: DeploymentParamsUI) => void;
}) {
  const onConfigChange = props.onConfigChange ?? jest.fn();
  const config = props.config ?? baseConfig;

  return render(
    <IntlProvider locale="en">
      <DeploymentSetup
        config={config}
        onConfigChange={onConfigChange}
        errors={{}}
        cloudInfo={cloudInfo}
        showNodeInfo={props.showNodeInfo ?? true}
        deploymentParamsMapper={deploymentParamsMapper}
        isSearchOnly={props.isSearchOnly}
      />
    </IntlProvider>
  );
}

describe('DeploymentSetup', () => {
  it('shows ingest/search optimization when not rerank', () => {
    renderDeploymentSetup({ isSearchOnly: false });

    expect(
      screen.getByText('Optimize this model deployment for your use case:')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('mlModelsStartDeploymentModalOptimized_optimizedForIngest')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('mlModelsStartDeploymentModalOptimized_optimizedForSearch')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('mlModelsStartDeploymentModalRerankWarning')
    ).not.toBeInTheDocument();
  });

  it('hides optimization and shows rerank memory warning when isSearchOnly', () => {
    renderDeploymentSetup({ isSearchOnly: true });

    expect(
      screen.queryByText('Optimize this model deployment for your use case:')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('mlModelsStartDeploymentModalOptimized_optimizedForIngest')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('mlModelsStartDeploymentModalRerankWarning')).toBeInTheDocument();
    expect(screen.getByText(RERANK_WARNING_DESCRIPTION)).toBeInTheDocument();
  });

  it('shows serverless rerank warning when isSearchOnly and showNodeInfo is false', () => {
    renderDeploymentSetup({ isSearchOnly: true, showNodeInfo: false });

    expect(screen.getByTestId('mlModelsStartDeploymentModalRerankWarning')).toBeInTheDocument();
    expect(screen.getByText(RERANK_WARNING_SERVERLESS_DESCRIPTION)).toBeInTheDocument();
    expect(screen.queryByText(RERANK_WARNING_DESCRIPTION)).not.toBeInTheDocument();
  });

  it('keeps vCPU slider available when isSearchOnly', () => {
    renderDeploymentSetup({ isSearchOnly: true });

    expect(screen.getByTestId('mlModelsStartDeploymentModalVCPULevel')).toBeInTheDocument();
    expect(
      screen.getByTestId('mlModelsStartDeploymentModalAdvancedConfiguration')
    ).toBeInTheDocument();
  });
});

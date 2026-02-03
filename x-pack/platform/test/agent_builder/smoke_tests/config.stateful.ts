/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreconfiguredConnectorConfig } from '@kbn/gen-ai-functional-testing';
import type { FtrConfigProviderContext } from '@kbn/test';
import { createStatefulTestConfig } from '../../api_integration_deployment_agnostic/default_configs/stateful.config.base';
import { agentBuilderApiServices } from '../services/api';

// EIS QA environment URL for Cloud Connected Mode
const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';

// eslint-disable-next-line import/no-default-export
export default async function (ftrContext: FtrConfigProviderContext) {
  // EIS smoke tests require a local ES instance with custom args - cannot run on Cloud
  if (process.env.TEST_CLOUD) {
    throw new Error(
      'Agent Builder EIS smoke tests cannot run on Cloud deployments. ' +
        'These tests require a local ES instance configured with EIS QA connectivity via CCM.'
    );
  }

  const preconfiguredConnectors = getPreconfiguredConnectorConfig();
  const eisServerArg = `xpack.inference.elastic.url=${EIS_QA_URL}`;

  const config = await createStatefulTestConfig({
    services: agentBuilderApiServices,
    testFiles: [require.resolve('./tests')],
    junit: {
      reportName: 'Agent Builder - Smoke Tests - API Integration',
    },
    // @ts-expect-error - esTestCluster is not in the type but is supported for local FTR
    esTestCluster: {
      serverArgs: [eisServerArg],
    },
    kbnTestServer: {
      serverArgs: [`--xpack.actions.preconfigured=${JSON.stringify(preconfiguredConnectors)}`],
    },
  })(ftrContext);

  return config;
}

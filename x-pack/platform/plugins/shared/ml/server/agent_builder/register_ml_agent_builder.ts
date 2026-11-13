/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ResolveMlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MlLicense } from '../../common/license';
import type { MlFeatures } from '../../common/constants/app';
import type { MlAuthorizationService } from '../lib/capabilities/check_capabilities';
import type { MlClientFactoryDeps } from './ml_client_factory';
import { registerAnomalyDetectionAgentBuilder } from './register_anomaly_detection';
import { registerDataFrameAnalyticsAgentBuilder } from './register_data_frame_analytics';

/**
 * Registers anomaly detection and data frame analytics skills on separate feature gates.
 * The anomaly detection gate does not cover data frame analytics.
 */
export const registerMlAgentBuilder = ({
  agentBuilder,
  enabledFeatures,
  resolveMlCapabilities,
  authorization,
  mlLicense,
  mlClientFactoryDeps,
}: {
  agentBuilder?: AgentBuilderPluginSetup;
  enabledFeatures: MlFeatures;
  resolveMlCapabilities: ResolveMlCapabilities;
  authorization?: MlAuthorizationService;
  mlLicense?: MlLicense;
  mlClientFactoryDeps: MlClientFactoryDeps;
}): void => {
  if (!agentBuilder) {
    return;
  }

  if (enabledFeatures.ad) {
    registerAnomalyDetectionAgentBuilder({
      agentBuilder,
      resolveMlCapabilities,
      authorization,
      mlLicense,
      enabledFeatures,
      mlClientFactoryDeps,
    });
  }

  if (enabledFeatures.dfa) {
    registerDataFrameAnalyticsAgentBuilder({
      agentBuilder,
      resolveMlCapabilities,
      authorization,
      mlLicense,
      enabledFeatures,
      mlClientFactoryDeps,
    });
  }
};

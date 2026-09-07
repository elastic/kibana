/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { PackageService } from '../services/epm/package_service';
import type { PackagePolicyService } from '../services/package_policy_service';
import { getIntegrationDetailsTool } from './tools/get_integration_details_tool';

export const registerFleetAgentBuilder = ({
  agentBuilder,
  getPackageService,
  getPackagePolicyService,
  getAuthz,
  logger,
}: {
  agentBuilder?: AgentBuilderPluginSetup;
  getPackageService: () => PackageService | undefined;
  getPackagePolicyService: () => PackagePolicyService | undefined;
  getAuthz: Parameters<typeof getIntegrationDetailsTool>[0]['getAuthz'];
  logger: Logger;
}): void => {
  if (!agentBuilder) {
    return;
  }

  agentBuilder.tools.register(
    getIntegrationDetailsTool({
      getPackageService,
      getPackagePolicyService,
      getAuthz,
      logger,
    })
  );
};

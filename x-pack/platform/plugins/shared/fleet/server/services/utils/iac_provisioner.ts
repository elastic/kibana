/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS_CLOUD_PROVIDER } from '../../../common/types/models/cloud_connector';
import type { CloudProvider } from '../../../common/types/models/cloud_connector';

import { appContextService } from '..';

import { isAgentlessEnabled } from './agentless';

export interface IacProvisionerConfig {
  enabled?: boolean;
  api?: {
    url?: string;
    tls?: {
      certificate?: string;
      key?: string;
      ca?: string;
    };
  };
}

/**
 * The IaC Provisioner is only reachable from agentless-capable environments for
 * the MVP; on-prem support is pending the auth decision in
 * https://github.com/elastic/security-team/issues/18240.
 */
export const isIacProvisionerEnabled = (): boolean => {
  return isAgentlessEnabled() && Boolean(appContextService.getConfig()?.iacProvisioner?.enabled);
};

// Providers the IaC Provisioner has blueprints for. Adding one here is not enough on its own:
// also widen the `provider` literal in server/types/rest_spec/iac_provisioner.ts,
// server/services/iac_provisioner.ts, common/types/rest_spec/iac_provisioner.ts, and the
// `cloudProvider !== AWS_CLOUD_PROVIDER` narrowing in
// server/services/cloud_connectors/iac_key_verification.ts, and the per-provider launch
// URL in public/components/cloud_connector/utils.ts (getIacLaunchUrl). The browser hook
// takes `provider` from each provider's form and is typed off the request, so it follows.
// Revisit FEDERATED_IDENTITY_WORKFLOW in server/services/iac_provisioner.ts too: `workflow`
// is sent on every render and is hardcoded to the one Kibana connector type that exists
// today, so a second connector type would need its own value rather than this constant.
const IAC_PROVISIONER_SUPPORTED_PROVIDERS: readonly CloudProvider[] = [AWS_CLOUD_PROVIDER];

/**
 * Gates every IaC-key check: IaCP must be enabled AND have blueprints for this provider, so
 * keyless Azure/GCP connectors are never flagged for an upgrade that has no dynamic template.
 * Design: https://github.com/elastic/ingest-dev/issues/9415
 */
export const isIacProvisionerSupportedFor = (provider: CloudProvider): boolean =>
  isIacProvisionerEnabled() && IAC_PROVISIONER_SUPPORTED_PROVIDERS.includes(provider);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import { agentPolicyRouteService, packagePolicyRouteService } from '../../../services';
import {
  formatInputs,
  formatVars,
} from '../../../../../../common/services/simplified_package_policy_helper';
import type {
  NewAgentPolicy,
  NewPackagePolicy,
  UpdatePackagePolicy,
  UpdateAgentPolicyRequest,
} from '../../../types';

function generateKibanaDevToolsRequest(method: string, path: string, body: any) {
  return `${method} kbn:${path}\n${JSON.stringify(body, null, 2)}\n`;
}

/**
 * Generate a request to create an agent policy that can be used in Kibana Dev tools
 * @param agentPolicy
 * @param withSysMonitoring
 * @returns
 */
export function generateCreateAgentPolicyDevToolsRequest(
  agentPolicy: NewAgentPolicy,
  withSysMonitoring?: boolean
) {
  return generateKibanaDevToolsRequest(
    'POST',
    `${agentPolicyRouteService.getCreatePath()}${withSysMonitoring ? '?sys_monitoring=true' : ''}`,
    agentPolicy
  );
}

/**
 * Generate a request to create a package policy that can be used in Kibana Dev tools
 * @param packagePolicy
 * @param withSysMonitoring
 * @returns
 */
export function generateCreatePackagePolicyDevToolsRequest(
  packagePolicy: NewPackagePolicy & { force?: boolean }
) {
  return generateKibanaDevToolsRequest('POST', packagePolicyRouteService.getCreatePath(), {
    policy_id: packagePolicy.policy_id ? packagePolicy.policy_id : '<agent_policy_id>',
    package: formatPackage(packagePolicy.package),
    ...omit(packagePolicy, 'policy_id', 'package', 'enabled'),
    inputs: formatInputs(packagePolicy.inputs),
    vars: formatVars(packagePolicy.vars),
  });
}

/**
 * Generate a request to update a package policy that can be used in Kibana Dev tools
 * @param packagePolicyId
 * @param packagePolicy
 * @returns
 */
export function generateUpdatePackagePolicyDevToolsRequest(
  packagePolicyId: string,
  packagePolicy: UpdatePackagePolicy
) {
  return generateKibanaDevToolsRequest(
    'PUT',
    packagePolicyRouteService.getUpdatePath(packagePolicyId),
    {
      package: formatPackage(packagePolicy.package),
      ...omit(packagePolicy, 'version', 'package', 'enabled', 'secret_references'),
      inputs: formatInputs(packagePolicy.inputs),
      vars: formatVars(packagePolicy.vars),
    }
  );
}

/**
 * Generate a request to update an agent policy that can be used in Kibana Dev tools
 * @param agentPolicyId
 * @param agentPolicy
 * @returns
 */
export function generateUpdateAgentPolicyDevToolsRequest(
  agentPolicyId: string,
  agentPolicy: UpdateAgentPolicyRequest['body']
) {
  return generateKibanaDevToolsRequest(
    'PUT',
    agentPolicyRouteService.getUpdatePath(agentPolicyId),
    omit(agentPolicy, 'version')
  );
}

function formatPackage(pkg: NewPackagePolicy['package']) {
  return omit(pkg, 'title');
}

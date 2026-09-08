/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PackageInfo,
  RegistryPolicyTemplate,
  RegistryPolicyIntegrationTemplate,
  RegistryVarsEntry,
} from '../types';

/**
 * FLEET-013 · Kibana-only (agentless ETL) integrations.
 *
 * A Kibana-only integration ships no Elastic Agent inputs — all of its work runs
 * inside Kibana (workflows, connectors, saved objects). It is a distinct category
 * from Elastic's *hosted* agentless (`deployment_modes.agentless.enabled`), which
 * still runs an agent, just one Elastic operates.
 *
 * The manifest signal is a policy template that declares no inputs:
 *
 * ```yaml
 * policy_templates:
 *   - name: sdlc_intel
 *     inputs: []                     # <- no Elastic Agent
 *     deployment_modes:
 *       default: agentless
 * ```
 *
 * Fleet UI uses this to hide Elastic Agent policy steps and to show a
 * connector-setup checklist instead.
 */

/** Suffixes that mark a package var as pointing at a stack connector. */
const CONNECTOR_VAR_SUFFIXES = ['_connector_id', '_connector'] as const;

const hasNoInputs = (policyTemplate: RegistryPolicyTemplate): boolean => {
  // `inputs` exists only on the integration arm of the RegistryPolicyTemplate
  // union. An input-only template is agent-based by definition, so it never
  // qualifies as Kibana-only.
  const { inputs } = policyTemplate as RegistryPolicyIntegrationTemplate;
  return Array.isArray(inputs) && inputs.length === 0;
};

/**
 * True when the package is Kibana-only: it has at least one policy template and
 * every template declares an empty `inputs` array.
 *
 * Deliberately strict — a package with *some* agent inputs still needs the agent
 * policy step, so a partial match must not hide it.
 */
export const isKibanaOnlyIntegration = (
  packageInfo?: Pick<PackageInfo, 'policy_templates'>,
  integrationToEnable?: string
): boolean => {
  const templates = packageInfo?.policy_templates;
  if (!templates || templates.length === 0) {
    return false;
  }

  if (integrationToEnable) {
    const template = templates.find(({ name }) => name === integrationToEnable);
    return template ? hasNoInputs(template) : false;
  }

  return templates.every(hasNoInputs);
};

/** True when a package var refers to a stack connector (by naming convention). */
export const isConnectorVar = (varDef: RegistryVarsEntry): boolean =>
  CONNECTOR_VAR_SUFFIXES.some((suffix) => varDef.name.endsWith(suffix));

export interface ConnectorChecklistItem {
  /** Package var name, e.g. `github_connector_id`. */
  name: string;
  title: string;
  description?: string;
  required: boolean;
  /** True once the var has a non-empty value in the policy. */
  configured: boolean;
}

/**
 * Builds the connector-setup checklist shown in place of the agent policy step.
 *
 * Only connector vars are listed: they are the actual prerequisite for a
 * Kibana-only integration to do any work, and the thing admins most often miss.
 */
export const getConnectorChecklist = (
  packageInfo?: Pick<PackageInfo, 'vars'>,
  currentValues: Record<string, unknown> = {}
): ConnectorChecklistItem[] => {
  const vars = packageInfo?.vars;
  if (!vars || vars.length === 0) {
    return [];
  }

  return vars.filter(isConnectorVar).map((varDef) => {
    const value = currentValues[varDef.name];
    const configured =
      value !== undefined && value !== null && String(value).trim().length > 0;

    return {
      name: varDef.name,
      title: varDef.title ?? varDef.name,
      description: varDef.description,
      required: varDef.required === true,
      configured,
    };
  });
};

/**
 * True when every *required* connector var is configured — i.e. the integration
 * can actually run. Optional connectors do not block enablement.
 */
export const isConnectorSetupComplete = (checklist: ConnectorChecklistItem[]): boolean =>
  checklist.filter((item) => item.required).every((item) => item.configured);

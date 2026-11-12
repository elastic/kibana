/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentContext, DeploymentEnvironment } from '@kbn/agent-builder-server';
import type { KibanaProductTier, KibanaSolution } from '@kbn/projects-solutions-groups';
import type { SolutionView } from '@kbn/spaces-plugin/common';

const environmentLabels: Record<DeploymentEnvironment, string> = {
  serverless: 'Elastic Cloud Serverless',
  ech: 'Elastic Cloud Hosted (ECH)',
  ece: 'Elastic Cloud Enterprise (ECE)',
  self_managed: 'Self-managed',
};

const projectTypeLabels = {
  observability: 'Observability',
  security: 'Security',
  search: 'Elasticsearch',
  vectordb: 'Vector Database',
} satisfies Record<KibanaSolution, string>;

const productTierLabels = {
  complete: 'Complete',
  essentials: 'Essentials',
  logs_essentials: 'Logs Essentials',
  search_ai_lake: 'Elastic AI SOC Engine (EASE)',
} satisfies Record<KibanaProductTier, string>;

const solutionViewLabels = {
  oblt: 'Observability',
  security: 'Security',
  es: 'Elasticsearch',
  vectordb: 'Vector Database',
  classic: 'Classic (all solutions)',
} satisfies Record<SolutionView, string>;

const toLabel = (labels: Partial<Record<string, string>>, value: string): string =>
  labels[value] ?? value;

const getLicenseLine = (license: DeploymentContext['license']): string | undefined => {
  if (!license?.type) {
    return undefined;
  }
  return `- License: ${license.type}${license.status ? ` (${license.status})` : ''}`;
};

/**
 * Builds the DEPLOYMENT prompt section describing the environment the agent runs in.
 */
export const getDeploymentInstructions = (deployment: DeploymentContext): string => {
  const { environment, version, airgapped, serverless, solution, license } = deployment;

  const lines = [
    `- Environment: ${environmentLabels[environment]}`,
    version ? `- Stack version: ${version}` : undefined,
    serverless
      ? `- Project type: ${toLabel(projectTypeLabels, serverless.projectType)}`
      : undefined,
    serverless?.productTier
      ? `- Product tier: ${toLabel(productTierLabels, serverless.productTier)}`
      : undefined,
    solution ? `- Space solution view: ${toLabel(solutionViewLabels, solution)}` : undefined,
    getLicenseLine(license),
    airgapped ? '- Air-gapped: yes (no access to the public internet)' : undefined,
  ].filter((line): line is string => line !== undefined);

  return `## DEPLOYMENT
You are running inside the following Elastic deployment. Use it to tailor your guidance (available features, navigation, terminology) to this environment. You may answer questions about the deployment directly from this section without calling a tool.
${lines.join('\n')}`;
};

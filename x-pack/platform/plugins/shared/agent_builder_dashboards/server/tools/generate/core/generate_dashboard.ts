/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { Logger } from '@kbn/core/server';
import type { ResolvePanelContent } from './operations/panels';
import type { PanelFailure } from './utils';
import { executeDashboardOperations, type DashboardOperation } from './operations';

/**
 * Host-provided capabilities the generate core needs but does not own.
 *
 * These are intentionally injected callbacks rather than imports so that any
 * environment (Kibana, a third-party MCP host, etc.) can supply its own
 * panel content resolution while reusing identical generation logic.
 *
 * Note: the generate core reads no attachment/state store. Prior dashboard
 * state arrives as `previousDashboardData`, and existing panel content arrives
 * already resolved via `panelConfig` panel inputs in the operations.
 */
export interface DashboardGenerationResolvers {
  /**
   * Resolves an inline panel request (natural language / ES|QL) into panel
   * content. Optional: environments without panel resolution support omit it.
   */
  resolvePanelContent?: ResolvePanelContent;
}

export interface GenerateDashboardParams {
  /** Prior dashboard payload to update, or undefined to generate a new one. */
  previousDashboardData?: DashboardAttachmentData;
  operations: DashboardOperation[];
  logger: Logger;
  resolvers?: DashboardGenerationResolvers;
}

export interface GenerateDashboardResult {
  /** The generated, environment-agnostic dashboard payload. */
  dashboardData: DashboardAttachmentData;
  /** Per-item generation failures (e.g. unresolved panel requests). */
  failures: PanelFailure[];
}

/**
 * Environment-agnostic dashboard generation.
 *
 * Transforms a prior dashboard payload plus an ordered list of operations into
 * a new dashboard payload. It owns no identity, persistence, or result-shape
 * concerns; those belong to the environment-specific render adapter that calls
 * this function.
 */
export const generateDashboard = async ({
  previousDashboardData,
  operations,
  logger,
  resolvers,
}: GenerateDashboardParams): Promise<GenerateDashboardResult> => {
  const { dashboardData, failures } = await executeDashboardOperations({
    dashboardData: previousDashboardData,
    operations,
    logger,
    resolvePanelContent: resolvers?.resolvePanelContent,
  });

  return {
    dashboardData,
    failures,
  };
};

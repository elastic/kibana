/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorParamsSchemaResolver } from '@kbn/workflows-yaml';
import { getAllConnectors } from '../schema';

/**
 * Resolves the Zod params schema for a given step/connector type from the
 * plugin's connector catalog. Used to inject connector-aware enrichment into
 * the connector-agnostic validation utilities exported from
 * `@kbn/workflows-yaml`.
 */
export const connectorParamsSchemaResolver: ConnectorParamsSchemaResolver = (stepType) =>
  getAllConnectors().find((connector) => connector.type === stepType)?.paramsSchema ?? null;

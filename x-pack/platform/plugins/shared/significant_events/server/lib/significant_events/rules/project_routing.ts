/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';

/**
 * Scopes a rule query across every Cross-Project Search linked project.
 *
 * Alerting v2 scopes its rule execution client with `projectRouting: 'space'`, so the CPS
 * request handler injects the space routing expression into the request body. Elasticsearch
 * resolves `default < body < SET`, so this in-query directive is what actually takes effect.
 * Knowledge indicators model all data available to a stream rather than one project, so
 * detection has to match the scope extraction ran at.
 *
 * `SET project_routing` is serverless-only preview syntax. It is applied unconditionally on
 * serverless so every rule is CPS-ready without a sync cycle when Cross-Project Search is
 * toggled on. On a single-project deployment `_alias:*` resolves to just that project — a
 * no-op.
 */
export const withAllProjectsRouting = (query: string): string =>
  `SET project_routing="${PROJECT_ROUTING_ALL}";\n${query}`;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SEED_DATA_APP_ID = 'agentBuilderDashboardsSeed';
export const SEED_DATA_APP_PATH = '/app/agent_builder_dashboards_seed';

/** Installs Kibana sample flights data + dashboards. */
export const SEED_DATA_FLIGHTS_ID = 'flights';
/** Installs Kibana sample eCommerce data + dashboards. */
export const SEED_DATA_ECOMMERCE_ID = 'ecommerce';
/** Seeds OpenTelemetry Kubernetes metrics for managed k8s dashboards. */
export const SEED_DATA_KUBERNETES_ID = 'kubernetes';

export const SEED_DATA_API_PATH = '/internal/agent_builder_dashboards/seed_data';

export type SeedDataSetId =
  | typeof SEED_DATA_FLIGHTS_ID
  | typeof SEED_DATA_ECOMMERCE_ID
  | typeof SEED_DATA_KUBERNETES_ID;

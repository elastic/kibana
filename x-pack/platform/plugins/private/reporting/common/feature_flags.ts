/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Rollout gate for PDF/PNG export on serverless, where rendering is performed by the remote
 * page-render-service rather than by Chromium inside Kibana (elastic/response-ops-team#750).
 *
 * Serverless only. Traditional/ECH has shipped these exports for years and never evaluates this
 * flag, so the rollout cannot regress it. The fallback is `false`, which matches the OFF variation
 * and leaves serverless exactly as it is today: no PDF/PNG entries in the share menu.
 *
 * `xpack.reporting.export_types.{pdf,png}.enabled` and this flag control different things and both
 * must allow an export type for it to appear. The config decides which export types Kibana wires up
 * at all — it is read during `setup`, so it cannot be a feature flag — while this flag decides
 * whether the wired-up entries are offered to users, and is re-evaluated every time a share menu is
 * opened. Enabling the flag therefore reveals only the export types the config already enabled.
 *
 * Segmentation rules live in elastic/kibana-feature-flags under
 * `feature-flags/platform/response-ops/`.
 */
export const REPORTING_SERVERLESS_EXPORT_ENABLED = 'reporting.serverlessExportEnabled';

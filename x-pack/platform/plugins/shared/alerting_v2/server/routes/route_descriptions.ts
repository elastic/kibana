/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cross-domain route response `description` values reused as OAS error example `summary`.
 * Keep route schemas and OAS examples aligned by importing these constants in both places.
 * Domain-specific descriptions live alongside their routes (e.g.
 * `alert_actions/alert_action_route_descriptions.ts`).
 */

export const INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION =
  'Indicates an invalid schema or parameters.';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared route response `description` values reused as OAS error example `summary`.
 * Keep route schemas and OAS examples aligned by importing these constants in both places.
 */

export const INVALID_QUERY_PARAMETERS_DESCRIPTION = 'Indicates invalid query parameters.';

export const INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION =
  'Indicates an invalid schema or parameters.';

export const INVALID_REQUEST_PARAMETERS_OR_BODY_DESCRIPTION =
  'Indicates invalid request parameters or body.';

export const INVALID_REQUEST_BODY_DESCRIPTION = 'Indicates invalid request body.';

export const ACTION_POLICY_NOT_FOUND_DESCRIPTION =
  'Indicates an action policy with the given ID does not exist.';

export const ACTION_POLICY_VERSION_CONFLICT_DESCRIPTION =
  'Indicates the action policy was concurrently updated by another caller.';

export const ACTION_POLICY_UPSERT_CONFLICT_DESCRIPTION =
  'Indicates the action policy was created or updated concurrently by another caller.';

export const RULE_NOT_FOUND_DESCRIPTION = 'Indicates a rule with the given ID does not exist.';

export const RULE_VERSION_CONFLICT_DESCRIPTION =
  'Indicates the rule was concurrently updated by another caller.';

export const RULE_UPSERT_CONFLICT_DESCRIPTION =
  'Indicates the rule was created or updated concurrently, or the request changes immutable fields.';

export const RULES_NOT_FOUND_DESCRIPTION = 'One or more rule ids could not be found.';

export const ALERT_EVENT_NOT_FOUND_DESCRIPTION = 'Indicates the alert event was not found.';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Rule-scoped route response `description` values. */

export const RULE_NOT_FOUND_DESCRIPTION = 'Indicates a rule with the given ID does not exist.';

export const RULE_VERSION_CONFLICT_DESCRIPTION =
  'Indicates the rule was concurrently updated by another caller.';

export const RULE_UPSERT_CONFLICT_DESCRIPTION =
  'Indicates the rule was created or updated concurrently, or the request changes immutable fields.';

export const RULES_NOT_FOUND_DESCRIPTION = 'One or more rule ids could not be found.';

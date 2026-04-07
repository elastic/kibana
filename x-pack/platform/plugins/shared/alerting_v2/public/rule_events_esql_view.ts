/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The underlying data source for rule events.
 *
 * The server-side ESQL view '$.rule-events' is registered as a convenience alias over this index.
 * ESQL views are not yet supported in serverless, so we target the source index directly.
 * When views are supported everywhere, this can be changed to '$.rule-events'.
 */
export const RULE_EVENTS_ESQL_SOURCE = '.rule-events';

export const RULE_EVENTS_ESQL_BASE_QUERY = `FROM ${RULE_EVENTS_ESQL_SOURCE}`;

export const buildRuleEventsEsqlQuery = (ruleId: string): string =>
  `${RULE_EVENTS_ESQL_BASE_QUERY} | WHERE rule.id == "${ruleId}"`;

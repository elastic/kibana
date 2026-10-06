/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
export declare enum ActionsCompletion {
  COMPLETE = 'complete',
  PARTIAL = 'partial',
}
export declare const ruleParamsSchema: t.IntersectionC<
  [
    t.TypeC<{
      alertId: t.StringC;
    }>,
    t.PartialC<{
      spaceId: t.StringC;
    }>
  ]
>;
export type RuleTaskParams = t.TypeOf<typeof ruleParamsSchema>;

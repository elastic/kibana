/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule, RuleTypeParams } from '../../types';

export interface UpdateRuleBody<Params extends RuleTypeParams = RuleTypeParams> {
  name: Rule<Params>['name'];
  tags: Rule<Params>['tags'];
  schedule: Rule<Params>['schedule'];
  params: Rule<Params>['params'];
  actions: Rule<Params>['actions'];
  throttle?: Rule<Params>['throttle'];
  notifyWhen?: Rule<Params>['notifyWhen'];
  alertDelay?: Rule<Params>['alertDelay'];
  flapping?: Rule<Params>['flapping'];
  artifacts?: Rule<Params>['artifacts'];
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Skeleton page object for the rule create flow. Methods are added as later phases need them.
 */
export class RuleCreatePage {
  constructor(private readonly page: ScoutPage) {}

  async gotoForRuleType(ruleTypeId: string) {
    await this.page.gotoApp(`rules/create/${ruleTypeId}`);
  }
}

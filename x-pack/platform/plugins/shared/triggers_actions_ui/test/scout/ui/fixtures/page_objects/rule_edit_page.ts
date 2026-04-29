/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Skeleton page object for the rule edit flow. Methods are added as later phases need them.
 */
export class RuleEditPage {
  constructor(private readonly page: ScoutPage) {}

  async gotoById(ruleId: string) {
    await this.page.gotoApp(`rules/edit/${ruleId}`);
  }
}

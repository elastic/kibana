/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/** Drives the rule details page. */
export class RuleDetailsPage {
  public readonly page: Locator;
  /** Header badge shown while the rule is disabled. */
  public readonly disabledBadge: Locator;
  /** Header badge shown while the rule is enabled. */
  public readonly enabledBadge: Locator;

  constructor(private readonly scoutPage: ScoutPage) {
    this.page = this.scoutPage.testSubj.locator('alertingV2RuleDetailsPage');
    this.disabledBadge = this.scoutPage.testSubj.locator('disabledBadge');
    this.enabledBadge = this.scoutPage.testSubj.locator('enabledBadge');
  }

  heading(ruleName: string) {
    return this.scoutPage.getByRole('heading', { name: ruleName, level: 1 });
  }
}

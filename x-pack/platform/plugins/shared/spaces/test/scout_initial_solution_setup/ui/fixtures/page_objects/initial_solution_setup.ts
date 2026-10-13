/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class InitialSolutionSetupPage {
  public readonly searchCard: Locator;

  constructor(private readonly page: ScoutPage) {
    this.searchCard = this.page.testSubj.locator('initialSolutionSetup-solutionViewEsOption');
  }

  async selectSearch() {
    await this.searchCard.getByRole('button', { name: 'Select Elasticsearch' }).click();
  }
}

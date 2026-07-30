/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class MlNavigation {
  constructor(private readonly page: ScoutPage) {}

  async navigateToMl() {
    await this.page.gotoApp('ml');
    await this.page.testSubj.locator('mlApp').waitFor({ state: 'visible' });
  }

  async navigateToDataVisualizer() {
    await this.navigateToMl();
    await this.page.testSubj.click('~mlMainTab & ~dataVisualizer');
    await this.page.testSubj
      .locator('~mlMainTab & ~dataVisualizer & ~selected')
      .waitFor({ state: 'visible' });
    await this.page.testSubj.locator('mlPageDataVisualizerSelector').waitFor({ state: 'visible' });
  }

  async navigateToDataDrift() {
    await this.navigateToDataVisualizer();
    await this.page.testSubj.click('mlDataVisualizerSelectDataDriftButton');
    await this.page.testSubj.locator('mlPageDataDrift').waitFor({ state: 'visible' });
  }

  async navigateToDataESQLDataVisualizer() {
    await this.navigateToDataVisualizer();
    await this.page.testSubj.click('mlDataVisualizerSelectESQLButton');
    await this.page.testSubj.locator('dataVisualizerIndexPage').waitFor({ state: 'visible' });
  }
}

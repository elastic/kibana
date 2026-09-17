/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { waitForKibanaLoadingToFinish } from '../kibana_loading';

export class MlNavigation {
  constructor(private readonly page: ScoutPage) {}

  async navigateToMl() {
    await this.page.gotoApp('ml');
    await waitForKibanaLoadingToFinish(this.page);
    await this.page.testSubj.locator('mlApp').waitFor({ state: 'visible', timeout: 30_000 });
  }

  async navigateToDataVisualizer() {
    // Path-based deep link: /app/ml/datavisualizer
    await this.page.gotoApp('ml/datavisualizer');
    await waitForKibanaLoadingToFinish(this.page);
    await this.page.testSubj.locator('mlApp').waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.testSubj
      .locator('mlPageDataVisualizerSelector')
      .waitFor({ state: 'visible', timeout: 30_000 });
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

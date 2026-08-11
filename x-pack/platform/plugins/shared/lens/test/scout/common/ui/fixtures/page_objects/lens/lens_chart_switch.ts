/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Chart-switcher helpers (warning checks / popover open-close).
 */
export class LensChartSwitch {
  private readonly chartSwitchPopover;
  private readonly chartSwitchList;

  constructor(private readonly page: ScoutPage) {
    this.chartSwitchPopover = this.page.testSubj.locator('lnsChartSwitchPopover');
    this.chartSwitchList = this.page.testSubj.locator('lnsChartSwitchList');
  }

  /**
   * Returns whether the chart switcher shows a data-loss warning for `visType`.
   * Leaves the switcher popover open (caller may continue to switch or dismiss).
   */
  async hasChartSwitchWarning(visType: string, searchTerm?: string): Promise<boolean> {
    await this.openChartSwitchPopover();
    const queryTerm = searchTerm ?? visType.substring(visType.length - 3);
    const searchInput = this.page.testSubj.locator('lnsChartSwitchSearch');
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(queryTerm);

    const option = this.chartSwitchList.getByTestId(`lnsChartSwitchPopover_${visType}`);
    await option.waitFor({ state: 'visible' });
    const alert = option.locator(`[data-test-subj="lnsChartSwitchPopoverAlert_${visType}"]`);
    return (await alert.count()) > 0;
  }

  /** Closes the chart switcher if it is open. */
  async closeChartSwitchPopover() {
    if (await this.chartSwitchList.isVisible()) {
      await this.page.keyboard.press('Escape');
      await this.chartSwitchList.waitFor({ state: 'hidden' });
    }
  }

  private async openChartSwitchPopover() {
    // Chart switch is a toggle — do not click again if the list is already open.
    if (await this.chartSwitchList.isVisible()) {
      return;
    }
    await this.chartSwitchPopover.click();
    await this.chartSwitchList.waitFor({ state: 'visible' });
  }
}

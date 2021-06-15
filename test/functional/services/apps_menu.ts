/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class AppsMenuService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly log = this.ctx.getService('log');
  private readonly config = this.ctx.getService('config');
  private readonly find = this.ctx.getService('find');

  private readonly defaultFindTimeout = this.config.get('timeouts.find');

  private async waitUntilLoadingHasFinished() {
    try {
      await this.isGlobalLoadingIndicatorVisible();
    } catch (exception) {
      if (exception.name === 'ElementNotVisible') {
        // selenium might just have been too slow to catch it
      } else {
        throw exception;
      }
    }
    await this.awaitGlobalLoadingIndicatorHidden();
  }

  private async isGlobalLoadingIndicatorVisible() {
    this.log.debug('isGlobalLoadingIndicatorVisible');
    return await this.testSubjects.exists('globalLoadingIndicator', { timeout: 1500 });
  }

  private async awaitGlobalLoadingIndicatorHidden() {
    await this.testSubjects.existOrFail('globalLoadingIndicator-hidden', {
      allowHidden: true,
      timeout: this.defaultFindTimeout * 10,
    });
  }
  /**
   * Close the collapsible nav
   * TODO #64541 can replace with a data-test-subj
   */
  public async closeCollapsibleNav() {
    const CLOSE_BUTTON = '[data-test-subj=collapsibleNav] > button';
    if (await this.find.existsByCssSelector(CLOSE_BUTTON)) {
      // Close button is only visible when focused
      const button = await this.find.byCssSelector(CLOSE_BUTTON);
      await button.focus();

      await this.find.clickByCssSelector(CLOSE_BUTTON);
    }
  }

  public async openCollapsibleNav() {
    if (!(await this.testSubjects.exists('collapsibleNav'))) {
      await this.testSubjects.click('toggleNavButton');
    }
  }

  /**
   * Get the attributes from each of the links in the apps menu
   */
  public async readLinks() {
    // wait for the chrome to finish initializing
    await this.waitUntilLoadingHasFinished();
    await this.openCollapsibleNav();
    const appMenu = await this.testSubjects.find('collapsibleNav');
    const $ = await appMenu.parseDomContent();
    const links = $.findTestSubjects('collapsibleNavAppLink')
      .toArray()
      .map((link) => {
        return {
          text: $(link).text(),
          href: $(link).attr('href'),
          disabled: $(link).attr('disabled') != null,
        };
      });

    await this.closeCollapsibleNav();

    return links;
  }

  /**
   * Get the attributes from the link with the given name.
   * @param name
   */
  public async getLink(name: string) {
    return (await this.readLinks()).find((nl) => nl.text === name);
  }

  /**
   * Determine if an app link with the given name exists
   * @param name
   */
  public async linkExists(name: string) {
    return (await this.readLinks()).some((nl) => nl.text === name);
  }

  /**
   * Click the app link within the app menu that has the given name
   * @param name
   * @param options.closeCollapsibleNav
   * @param options.category - optional field to ensure that a link is clicked in a particular category
   *                           helpful when there may be a recent link with the same name as an app
   */
  public async clickLink(
    name: string,
    {
      closeCollapsibleNav = true,
      category,
    }: { closeCollapsibleNav?: boolean; category?: string } = {}
  ) {
    try {
      this.log.debug(`click "${name}" app link`);
      await this.openCollapsibleNav();
      let nav;
      if (typeof category === 'string') {
        nav = await this.testSubjects.find(`collapsibleNavGroup-${category}`);
      } else {
        nav = await this.testSubjects.find('collapsibleNav');
      }
      const link = await nav.findByPartialLinkText(name);
      await link.click();

      if (closeCollapsibleNav) {
        await this.closeCollapsibleNav();
      }
    } finally {
      // Intentionally empty
    }
  }
}

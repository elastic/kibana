/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class GlobalNavService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');

  public async moveMouseToLogo(): Promise<void> {
    await this.testSubjects.moveMouseTo('headerGlobalNav > logo');
  }

  public async clickLogo(): Promise<void> {
    return await this.testSubjects.click('headerGlobalNav > logo');
  }

  public async clickNewsfeed(): Promise<void> {
    return await this.testSubjects.click('headerGlobalNav > newsfeed');
  }

  public async exists(): Promise<boolean> {
    return await this.testSubjects.exists('headerGlobalNav');
  }

  public async getFirstBreadcrumb(): Promise<string> {
    return await this.testSubjects.getVisibleText(
      'headerGlobalNav > breadcrumbs > ~breadcrumb & ~first'
    );
  }

  public async getLastBreadcrumb(): Promise<string> {
    return await this.testSubjects.getVisibleText(
      'headerGlobalNav > breadcrumbs > ~breadcrumb & ~last'
    );
  }

  public async badgeExistsOrFail(expectedLabel: string): Promise<void> {
    await this.testSubjects.existOrFail('headerBadge');
    const actualLabel = await this.testSubjects.getAttribute(
      'headerBadge',
      'data-test-badge-label'
    );
    expect(actualLabel.toUpperCase()).to.equal(expectedLabel.toUpperCase());
  }

  public async badgeMissingOrFail(): Promise<void> {
    await this.testSubjects.missingOrFail('headerBadge');
  }

  public async openSolutionNavSwitcher(): Promise<void> {
    if (await this.testSubjects.exists(`~solutionNavSwitcherPanel`, { timeout: 0 })) return;

    await this.testSubjects.click('~solutionNavSwitcher');
    await this.testSubjects.existOrFail('~solutionNavSwitcherPanel');
  }

  public async changeSolutionNavigation(id: 'es' | 'oblt' | 'search'): Promise<void> {
    if (!(await this.testSubjects.exists(`~solutionNavSwitcherPanel`, { timeout: 0 }))) {
      await this.openSolutionNavSwitcher();
    }
    await this.testSubjects.click(`~solutionNavSwitcherPanel > ${`~solutionNavSwitcher-${id}`}`);
  }
}

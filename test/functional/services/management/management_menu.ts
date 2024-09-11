/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../../ftr_provider_context';

export class ManagementMenuService extends FtrService {
  private readonly find = this.ctx.getService('find');

  public async getSections() {
    const sectionsElements = await this.find.allByCssSelector(
      '.kbnSolutionNav .euiSideNavItem--root'
    );

    const sections = [];

    for (const el of sectionsElements) {
      const sectionId = await (
        await el.findByClassName('euiSideNavItemButton')
      ).getAttribute('data-test-subj');
      const sectionLinks = await Promise.all(
        (
          await el.findAllByCssSelector('.euiSideNavItem > a.euiSideNavItemButton')
        ).map((item) => item.getAttribute('data-test-subj'))
      );

      sections.push({ sectionId, sectionLinks });
    }

    return sections;
  }
}

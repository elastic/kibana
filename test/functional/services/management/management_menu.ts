/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from 'test/functional/ftr_provider_context';

export function ManagementMenuProvider({ getService }: FtrProviderContext) {
  const find = getService('find');

  class ManagementMenu {
    public async getSections() {
      const sectionsElements = await find.allByCssSelector(
        '.mgtSideBarNav > .euiSideNav__content > .euiSideNavItem'
      );

      const sections = [];

      for (const el of sectionsElements) {
        const sectionId = await (await el.findByClassName('euiSideNavItemButton')).getAttribute(
          'data-test-subj'
        );
        const sectionLinks = await Promise.all(
          (await el.findAllByCssSelector('.euiSideNavItem > a.euiSideNavItemButton')).map((item) =>
            item.getAttribute('data-test-subj')
          )
        );

        sections.push({ sectionId, sectionLinks });
      }

      return sections;
    }
  }

  return new ManagementMenu();
}

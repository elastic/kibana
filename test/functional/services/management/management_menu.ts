/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

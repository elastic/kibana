/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';

import type { NavigationID as MlNavId } from '@kbn/default-nav-ml';
import type { NavigationID as AlNavId } from '@kbn/default-nav-analytics';
import type { NavigationID as MgmtNavId } from '@kbn/default-nav-management';
import type { NavigationID as DevNavId } from '@kbn/default-nav-devtools';

// use this for nicer type suggestions, but allow any string anyway
type NavigationId = MlNavId | AlNavId | MgmtNavId | DevNavId | string;

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../ftr_provider_context';

const getSectionIdTestSubj = (sectionId: NavigationId) => `~nav-item-${sectionId}`;

const TIMEOUT_CHECK = 3000;

export function SolutionNavigationProvider(ctx: Pick<FtrProviderContext, 'getService'>) {
  const testSubjects = ctx.getService('testSubjects');
  const browser = ctx.getService('browser');
  const retry = ctx.getService('retry');
  const log = ctx.getService('log');

  async function getByVisibleText(
    selector: string | (() => Promise<WebElementWrapper[]>),
    text: string
  ) {
    const subjects =
      typeof selector === 'string' ? await testSubjects.findAll(selector) : await selector();
    let found: WebElementWrapper | null = null;
    for (const subject of subjects) {
      const visibleText = await subject.getVisibleText();
      if (visibleText === text) {
        found = subject;
        break;
      }
    }
    return found;
  }

  return {
    // check that chrome ui is in project/solution mode
    async expectExists() {
      await testSubjects.existOrFail('kibanaProjectHeader');
    },
    async clickLogo() {
      await testSubjects.click('nav-header-logo');
    },
    // side nav related actions
    sidenav: {
      async expectLinkExists(
        by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }
      ) {
        if ('deepLinkId' in by) {
          await testSubjects.existOrFail(`~nav-item-deepLinkId-${by.deepLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
        } else if ('navId' in by) {
          await testSubjects.existOrFail(`~nav-item-id-${by.navId}`, { timeout: TIMEOUT_CHECK });
        } else {
          expect(await getByVisibleText('~nav-item', by.text)).not.be(null);
        }
      },
      async expectLinkMissing(
        by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }
      ) {
        if ('deepLinkId' in by) {
          await testSubjects.missingOrFail(`~nav-item-deepLinkId-${by.deepLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
        } else if ('navId' in by) {
          await testSubjects.missingOrFail(`~nav-item-id-${by.navId}`, { timeout: TIMEOUT_CHECK });
        } else {
          expect(await getByVisibleText('~nav-item', by.text)).be(null);
        }
      },
      async expectLinkActive(
        by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }
      ) {
        await this.expectLinkExists(by);
        if ('deepLinkId' in by) {
          await testSubjects.existOrFail(
            `~nav-item-deepLinkId-${by.deepLinkId} & ~nav-item-isActive`,
            { timeout: TIMEOUT_CHECK }
          );
        } else if ('navId' in by) {
          await testSubjects.existOrFail(`~nav-item-id-${by.navId} & ~nav-item-isActive`, {
            timeout: TIMEOUT_CHECK,
          });
        } else {
          await retry.try(async () => {
            const link = await getByVisibleText('~nav-item', by.text);
            expect(await link!.elementHasClass(`nav-item-isActive`)).to.be(true);
          });
        }
      },
      async clickLink(by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }) {
        await this.expectLinkExists(by);
        if ('deepLinkId' in by) {
          await testSubjects.click(`~nav-item-deepLinkId-${by.deepLinkId}`);
        } else if ('navId' in by) {
          await testSubjects.click(`~nav-item-id-${by.navId}`);
        } else {
          await retry.try(async () => {
            const link = await getByVisibleText('~nav-item', by.text);
            await link!.click();
          });
        }
      },
      async findLink(by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }) {
        await this.expectLinkExists(by);
        if ('deepLinkId' in by) {
          return testSubjects.find(`~nav-item-deepLinkId-${by.deepLinkId}`);
        } else if ('navId' in by) {
          return testSubjects.find(`~nav-item-id-${by.navId}`);
        } else {
          return retry.try(async () => {
            const link = await getByVisibleText('~nav-item', by.text);
            return link;
          });
        }
      },
      async clickPanelLink(deepLinkId: string) {
        await testSubjects.click(`~panelNavItem-id-${deepLinkId}`);
      },
      async expectSectionExists(sectionId: NavigationId) {
        log.debug('SolutionNavigation.sidenav.expectSectionExists', sectionId);
        await testSubjects.existOrFail(getSectionIdTestSubj(sectionId), { timeout: TIMEOUT_CHECK });
      },
      async isSectionOpen(sectionId: NavigationId) {
        await this.expectSectionExists(sectionId);
        const collapseBtn = await testSubjects.find(`~accordionArrow-${sectionId}`);
        const isExpanded = await collapseBtn.getAttribute('aria-expanded');
        return isExpanded === 'true';
      },
      async expectSectionOpen(sectionId: NavigationId) {
        log.debug('SolutionNavigation.sidenav.expectSectionOpen', sectionId);
        await this.expectSectionExists(sectionId);
        await retry.waitFor(`section ${sectionId} to be open`, async () => {
          const isOpen = await this.isSectionOpen(sectionId);
          return isOpen;
        });
      },
      async expectSectionClosed(sectionId: NavigationId) {
        await this.expectSectionExists(sectionId);
        await retry.waitFor(`section ${sectionId} to be closed`, async () => {
          const isOpen = await this.isSectionOpen(sectionId);
          return !isOpen;
        });
      },
      async openSection(sectionId: NavigationId) {
        log.debug('SolutionNavigation.sidenav.openSection', sectionId);
        await this.expectSectionExists(sectionId);
        const isOpen = await this.isSectionOpen(sectionId);
        if (isOpen) return;
        const collapseBtn = await testSubjects.find(`~accordionArrow-${sectionId}`, TIMEOUT_CHECK);
        await collapseBtn.click();
        await this.expectSectionOpen(sectionId);
      },
      async closeSection(sectionId: NavigationId) {
        await this.expectSectionExists(sectionId);
        const isOpen = await this.isSectionOpen(sectionId);
        if (!isOpen) return;
        const collapseBtn = await testSubjects.find(`~accordionArrow-${sectionId}`, TIMEOUT_CHECK);
        await collapseBtn.click();
        await this.expectSectionClosed(sectionId);
      },
      async expectPanelExists(sectionId: NavigationId) {
        log.debug('SolutionNavigation.sidenav.expectPanelExists', sectionId);
        await testSubjects.existOrFail(`~sideNavPanel-id-${sectionId}`, {
          timeout: TIMEOUT_CHECK,
        });
      },
      async isPanelOpen(sectionId: NavigationId) {
        try {
          const panel = await testSubjects.find(`~sideNavPanel-id-${sectionId}`, TIMEOUT_CHECK);
          return !!panel;
        } catch (err) {
          return false;
        }
      },
      async openPanel(
        sectionId: NavigationId,
        { button }: { button: 'icon' | 'link' } = { button: 'icon' }
      ) {
        log.debug('SolutionNavigation.sidenav.openPanel', sectionId);

        const isOpen = await this.isPanelOpen(sectionId);
        if (isOpen) return;

        const panelOpenerBtn = await testSubjects.find(
          button === 'icon' ? `~panelOpener-id-${sectionId}` : `~nav-item-id-${sectionId}`,
          TIMEOUT_CHECK
        );

        await panelOpenerBtn.click();
      },
      async closePanel(
        sectionId: NavigationId,
        { button }: { button: 'icon' | 'link' } = { button: 'icon' }
      ) {
        log.debug('SolutionNavigation.sidenav.closePanel', sectionId);

        const isOpen = await this.isPanelOpen(sectionId);
        if (!isOpen) return;

        const panelOpenerBtn = await testSubjects.find(
          button === 'icon' ? `~panelOpener-id-${sectionId}` : `~nav-item-id-${sectionId}`,
          TIMEOUT_CHECK
        );

        await panelOpenerBtn.click();
      },
      async isCollapsed() {
        const collapseNavBtn = await testSubjects.find('euiCollapsibleNavButton', TIMEOUT_CHECK);
        return (await collapseNavBtn.getAttribute('aria-expanded')) === 'false';
      },
      async isExpanded() {
        return !(await this.isCollapsed());
      },
      /**
       * Toggles collapsed state of sidenav
       */
      async toggle(collapsed?: boolean) {
        const currentlyCollapsed = await this.isCollapsed();
        const shouldBeCollapsed = collapsed ?? !currentlyCollapsed;

        if (currentlyCollapsed !== shouldBeCollapsed) {
          log.debug(
            'SolutionNavigation.sidenav.toggle',
            shouldBeCollapsed ? 'Collapsing' : 'Expanding'
          );

          const collapseNavBtn = await testSubjects.find('euiCollapsibleNavButton', TIMEOUT_CHECK);
          await collapseNavBtn.click();
        }
      },
    },
    breadcrumbs: {
      async expectExists() {
        await testSubjects.existOrFail('breadcrumbs', { timeout: TIMEOUT_CHECK });
      },
      async clickBreadcrumb(by: { deepLinkId: AppDeepLinkId } | { text: string }) {
        if ('deepLinkId' in by) {
          await testSubjects.click(`~breadcrumb-deepLinkId-${by.deepLinkId}`);
        } else {
          await (await getByVisibleText('~breadcrumb', by.text))?.click();
        }
      },
      getBreadcrumb(by: { deepLinkId: AppDeepLinkId } | { text: string }) {
        if ('deepLinkId' in by) {
          return testSubjects.find(`~breadcrumb-deepLinkId-${by.deepLinkId}`, TIMEOUT_CHECK);
        } else {
          return getByVisibleText('~breadcrumb', by.text);
        }
      },
      async expectBreadcrumbExists(by: { deepLinkId: AppDeepLinkId } | { text: string }) {
        log.debug('SolutionNavigation.breadcrumbs.expectBreadcrumbExists', JSON.stringify(by));
        if ('deepLinkId' in by) {
          await testSubjects.existOrFail(`~breadcrumb-deepLinkId-${by.deepLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
        } else {
          await retry.try(async () => {
            expect(await getByVisibleText('~breadcrumb', by.text)).not.be(null);
          });
        }
      },
      async expectBreadcrumbMissing(by: { deepLinkId: AppDeepLinkId } | { text: string }) {
        if ('deepLinkId' in by) {
          await testSubjects.missingOrFail(`~breadcrumb-deepLinkId-${by.deepLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
        } else {
          await retry.try(async () => {
            expect(await getByVisibleText('~breadcrumb', by.text)).be(null);
          });
        }
      },
      async expectBreadcrumbTexts(expectedBreadcrumbTexts: string[]) {
        log.debug(
          'SolutionNavigation.breadcrumbs.expectBreadcrumbTexts',
          JSON.stringify(expectedBreadcrumbTexts)
        );
        await retry.try(async () => {
          const breadcrumbsContainer = await testSubjects.find('breadcrumbs', TIMEOUT_CHECK);
          const breadcrumbs = await breadcrumbsContainer.findAllByTestSubject('~breadcrumb');
          breadcrumbs.shift(); // remove home
          expect(expectedBreadcrumbTexts.length).to.eql(breadcrumbs.length);
          const texts = await Promise.all(breadcrumbs.map((b) => b.getVisibleText()));
          expect(expectedBreadcrumbTexts).to.eql(texts);
        });
      },
    },
    recent: {
      async expectExists() {
        await testSubjects.existOrFail('nav-item-recentlyAccessed', { timeout: TIMEOUT_CHECK });
      },
      async expectHidden() {
        await testSubjects.missingOrFail('nav-item-recentlyAccessed', { timeout: TIMEOUT_CHECK });
      },
      async expectLinkExists(text: string) {
        await this.expectExists();
        let foundLink: WebElementWrapper | null = null;
        await retry.try(async () => {
          foundLink = await getByVisibleText(
            async () =>
              (
                await testSubjects.find('nav-item-recentlyAccessed', TIMEOUT_CHECK)
              ).findAllByTagName('a'),
            text
          );
          expect(!!foundLink).to.be(true);
        });

        return foundLink!;
      },
      async clickLink(text: string) {
        const link = await this.expectLinkExists(text);
        await link!.click();
      },
    },

    // helper to assert that the page did not reload
    async createNoPageReloadCheck() {
      const trackReloadTs = Date.now();
      await browser.execute(
        ({ ts }) => {
          // @ts-ignore
          window.__testTrackReload__ = ts;
        },
        {
          ts: trackReloadTs,
        }
      );

      return async () => {
        const noReload = await browser.execute(
          ({ ts }) => {
            // @ts-ignore
            return window.__testTrackReload__ && window.__testTrackReload__ === ts;
          },
          {
            ts: trackReloadTs,
          }
        );
        expect(noReload).to.be(true);
      };
    },
  };
}

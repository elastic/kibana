/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This test expects a deprecation which is valid only on 7.x. So, this is enabled on 7.x
 * and disabled on 8.x. Should be enabled again when 8.x to next major upgrade happens with
 * valid deprecations
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const a11y = getService('a11y');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Upgrade Assistant Accessibility', () => {
    describe('Overview page', () => {
      beforeEach(async () => {
        await PageObjects.upgradeAssistant.navigateToPage();
        await retry.waitFor('Upgrade Assistant overview page to be visible', async () => {
          return testSubjects.exists('overview');
        });
      });

      it('has no accessibility issues', async () => {
        await a11y.testAppSnapshot();
      });

      it('has no accessibility issues for viewDetailsLink flyout', async () => {
        const viewDetailsLink = await testSubjects.find('viewDetailsLink');
        await viewDetailsLink.click();

        await a11y.testAppSnapshot();
      });
    });

    describe('Elasticsearch deprecations page', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToUrl(
          'management',
          'stack/upgrade_assistant/es_deprecations',
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
            shouldUseHashForSubUrl: false,
          }
        );

        await retry.waitFor('ES deprecation page to be visible', async () =>
          (await find.byCssSelector('.euiPageContentBody.kbnAppWrapper')).isDisplayed()
        );
      });

      it('has no accessibility issues', async () => {
        await a11y.testAppSnapshot();
      });
    });

    describe('Kibana deprecations page', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToUrl(
          'management',
          'stack/upgrade_assistant/kibana_deprecations',
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
            shouldUseHashForSubUrl: false,
          }
        );

        await retry.waitFor('Kibana deprecation page to be visible', async () =>
          (await find.byCssSelector('.euiPageContentBody.kbnAppWrapper')).isDisplayed()
        );
      });

      it('has no accessibility issues', async () => {
        await a11y.testAppSnapshot();
      });
    });
  });
}

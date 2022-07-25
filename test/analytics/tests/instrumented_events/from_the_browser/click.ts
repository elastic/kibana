/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../services';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ebtUIHelper = getService('kibana_ebt_ui');
  const { common } = getPageObjects(['common']);

  describe('General "click"', () => {
    beforeEach(async () => {
      // Navigating to `home` with the Welcome prompt because some runs were flaky
      // as we handle the Welcome screen only if the login prompt pops up.
      // Otherwise, it stays in the Welcome screen :/
      await common.navigateToApp('home', { disableWelcomePrompt: false });
      // Clicking the button skipWelcomeScreen.
      await common.clickAndValidate('skipWelcomeScreen', 'headerGlobalNav');
    });

    it('should emit a "click" event', async () => {
      const [event] = await ebtUIHelper.getEvents(1, { eventTypes: ['click'] });
      expect(event.event_type).to.eql('click');
      expect(event.properties.target).to.be.an('array');
      const targets = event.properties.target as string[];
      expect(targets.includes('DIV')).to.be(true);
      expect(targets.includes('class=homWelcome')).to.be(true);
      expect(targets.includes('data-test-subj=homeWelcomeInterstitial')).to.be(true);
      expect(targets.includes('BUTTON')).to.be(true);
      expect(targets.includes('data-test-subj=skipWelcomeScreen')).to.be(true);
    });
  });
}

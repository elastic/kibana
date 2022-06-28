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
      await common.navigateToApp('home');
      // Just click on the top div and expect it's still there... we're just testing the click event generation
      await common.clickAndValidate('kibanaChrome', 'kibanaChrome');
    });

    it('should emit a "click" event', async () => {
      const [event] = await ebtUIHelper.getEvents(1, { eventTypes: ['click'] });
      expect(event.event_type).to.eql('click');
      expect(event.properties.target).to.be.an('array');
      const targets = event.properties.target as string[];
      expect(targets.includes('DIV')).to.be(true);
      expect(targets.includes('id=kibana-body')).to.be(true);
      expect(targets.includes('data-test-subj=kibanaChrome')).to.be(true);
    });
  });
}

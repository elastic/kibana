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
  const browser = getService('browser');

  describe('Loaded Kibana', () => {
    beforeEach(async () => {
      await common.navigateToApp('home');
    });

    it('should emit the "Loaded Kibana" event', async () => {
      const [event] = await ebtUIHelper.getEvents(1, { eventTypes: ['Loaded Kibana'] });
      expect(event.event_type).to.eql('Loaded Kibana');
      expect(event.properties).to.have.property('kibana_version');
      expect(event.properties.kibana_version).to.be.a('string');
      expect(event.properties).to.have.property('protocol');
      expect(event.properties.protocol).to.be.a('string');

      // Kibana Loaded timings
      expect(event.properties).to.have.property('load_started');
      expect(event.properties.load_started).to.be.a('number');
      expect(event.properties).to.have.property('bootstrap_started');
      expect(event.properties.bootstrap_started).to.be.a('number');
      expect(event.properties).to.have.property('core_created');
      expect(event.properties.core_created).to.be.a('number');
      expect(event.properties).to.have.property('setup_done');
      expect(event.properties.setup_done).to.be.a('number');
      expect(event.properties).to.have.property('start_done');
      expect(event.properties.start_done).to.be.a('number');
      expect(event.properties).to.have.property('first_app_nav');
      expect(event.properties.start_done).to.be.a('number');

      if (browser.isChromium) {
        // Kibana Loaded memory
        expect(event.properties).to.have.property('memory_js_heap_size_limit');
        expect(event.properties.memory_js_heap_size_limit).to.be.a('number');
        expect(event.properties).to.have.property('memory_js_heap_size_total');
        expect(event.properties.memory_js_heap_size_total).to.be.a('number');
        expect(event.properties).to.have.property('memory_js_heap_size_used');
        expect(event.properties.memory_js_heap_size_used).to.be.a('number');
      }
    });
  });
}

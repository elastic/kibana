/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KIBANA_LOADED_EVENT } from '@kbn/core/utils';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../services';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ebtUIHelper = getService('kibana_ebt_ui');
  const { common } = getPageObjects(['common']);

  describe('Loaded kibana', () => {
    beforeEach(async () => {
      await common.navigateToApp('home');
    });

    it('should emit the "Loaded Kibana" event', async () => {
      const [event] = await ebtUIHelper.getEvents(1, { eventTypes: [KIBANA_LOADED_EVENT] });
      expect(event.event_type).to.eql(KIBANA_LOADED_EVENT);
      expect(event.properties).to.have.property('kibana_version');
      expect(event.properties.kibana_version).to.be.a('string');
      expect(event.properties).to.have.property('protocol');
      expect(event.properties.protocol).to.be.a('string');

      // Kibana Loaded timings
      expect(event.properties).to.have.property('duration');
      expect(event.properties.duration).to.be.a('number');

      expect(event.properties).to.have.property('key1', 'load-started');
      expect(event.properties).to.have.property('key2', 'bootstrap-started');
      expect(event.properties).to.have.property('key3', 'core-created');
      expect(event.properties).to.have.property('key4', 'setup-done');
      expect(event.properties).to.have.property('key5', 'start-done');

      expect(event.properties.value1).to.be.a('number');
      expect(event.properties.value2).to.be.a('number');
      expect(event.properties.value3).to.be.a('number');
      expect(event.properties.value4).to.be.a('number');
      expect(event.properties.value5).to.be.a('number');

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
    });
  });
}

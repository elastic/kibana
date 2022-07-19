/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Event } from '@kbn/analytics-client';
import { KIBANA_LOADED_EVENT } from '@kbn/core/utils';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../services';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ebtUIHelper = getService('kibana_ebt_ui');
  const { common } = getPageObjects(['common']);

  describe('Loaded Kibana', () => {
    beforeEach(async () => {
      await common.navigateToApp('home');
    });

    it('should emit the legacy "Loaded Kibana" and new kibana-loaded events', async () => {
      const events = await ebtUIHelper.getEvents(2, {
        eventTypes: [KIBANA_LOADED_EVENT, 'Loaded Kibana'],
      });

      const legacyEvent = events.find(
        (e) => e.event_type !== KIBANA_LOADED_EVENT
      ) as unknown as Event;
      const event = events.find((e) => e.event_type === KIBANA_LOADED_EVENT) as unknown as Event;

      // Legacy event
      expect(legacyEvent.event_type).to.eql('Loaded Kibana');
      expect(event.properties).to.have.property('kibana_version');
      expect(event.properties.kibana_version).to.be.a('string');
      expect(event.properties).to.have.property('protocol');
      expect(event.properties.protocol).to.be.a('string');

      // New event
      expect(event.event_type).to.eql(KIBANA_LOADED_EVENT);
      expect(event.properties).to.have.property('kibana_version');
      expect(event.properties.kibana_version).to.be.a('string');
      expect(event.properties).to.have.property('protocol');
      expect(event.properties.protocol).to.be.a('string');

      // Kibana Loaded timings
      expect(event.properties).to.have.property('duration');
      expect(event.properties.duration).to.be.a('number');

      expect(event.properties).to.have.property('key1', 'load_started');
      expect(event.properties).to.have.property('key2', 'bootstrap_started');
      expect(event.properties).to.have.property('key3', 'core_created');
      expect(event.properties).to.have.property('key4', 'setup_done');
      expect(event.properties).to.have.property('key5', 'start_done');

      expect(event.properties.value1).to.be.a('number');
      expect(event.properties.value2).to.be.a('number');
      expect(event.properties.value3).to.be.a('number');
      expect(event.properties.value4).to.be.a('number');
      expect(event.properties.value5).to.be.a('number');
    });
  });
}

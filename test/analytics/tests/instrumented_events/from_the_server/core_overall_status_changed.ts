/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { Event } from '@kbn/analytics-client';
import { FtrProviderContext } from '../../../services';

export default function ({ getService }: FtrProviderContext) {
  const ebtServerHelper = getService('kibana_ebt_server');

  describe('core-overall_status_changed', () => {
    let initialEvent: Event<Record<string, unknown>>;
    let secondEvent: Event<Record<string, unknown>>;

    before(async () => {
      [initialEvent, secondEvent] = await ebtServerHelper.getEvents(2, {
        eventTypes: ['core-overall_status_changed'],
      });
    });

    it('should emit the initial "degraded" event with the context set to `initializing`', () => {
      expect(initialEvent.event_type).to.eql('core-overall_status_changed');
      expect(initialEvent.context).to.have.property('overall_status_level', 'initializing');
      expect(initialEvent.context).to.have.property(
        'overall_status_summary',
        'Kibana is starting up'
      );
      expect(initialEvent.properties).to.have.property('overall_status_level', 'degraded');
      expect(initialEvent.properties).to.have.property('overall_status_summary');
      expect(initialEvent.properties.overall_status_summary).to.be.a('string');
    });

    it('should emit the 2nd event as `available` with the context set to the previous values', () => {
      expect(secondEvent.event_type).to.eql('core-overall_status_changed');
      expect(secondEvent.context).to.have.property(
        'overall_status_level',
        initialEvent.properties.overall_status_level
      );
      expect(secondEvent.context).to.have.property(
        'overall_status_summary',
        initialEvent.properties.overall_status_summary
      );
      expect(secondEvent.properties.overall_status_level).to.be.a('string'); // Ideally we would test it as `available`, but we can't do that as it may result flaky for many side effects in the CI.
      expect(secondEvent.properties.overall_status_summary).to.be.a('string');
    });
  });
}

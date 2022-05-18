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

  describe('core-ops_metrics', () => {
    let initialEvent: Event;
    let secondEvent: Event;
    let thirdEvent: Event;

    before(async () => {
      [initialEvent, secondEvent, thirdEvent] = await ebtServerHelper.getLastEvents(3, [
        'core-ops_metrics',
      ]);
    });

    it('should emit the initial ops metrics event', () => {
      expect(initialEvent.event_type).to.eql('core-ops_metrics');
      // context assertions
      expect(initialEvent.context).to.have.property('kibana_uuid');
      expect(initialEvent.context.kibana_uuid).to.be.a('string');
      expect(initialEvent.context).to.have.property('pid');
      expect(initialEvent.context.pid).to.be.a('number');

      // properties assertions. Note: Once we implement schema and collector event validation, we can rely on ts to verify the shape
      expect(initialEvent.properties).to.have.property('collected_at');
      expect(initialEvent.properties).to.have.property('process');
      expect(initialEvent.properties).to.have.property('processes');
      expect(initialEvent.properties).to.have.property('os');
      expect(initialEvent.properties).to.have.property('response_times');
      expect(initialEvent.properties).to.have.property('requests');
      expect(initialEvent.properties).to.have.property('concurrent_connections');
    });

    it('should emit the 2nd event with extended context', () => {
      expect(secondEvent.event_type).to.eql('core-ops_metrics');
      expect(secondEvent.context).to.have.property('overall_status_level');
      expect(secondEvent.context).to.have.property('overall_status_summary');
    });

    it('should emit the 3rd event with updated ops metrics', () => {
      // we can be fairly certain that at least the os load will have changed after startup.
      const propertyKeys = ['collected_at', 'os'];
      propertyKeys.forEach((key: string) => {
        expect(initialEvent.properties[key]).not.to.be(thirdEvent.properties[key]);
      });
    });
  });
}

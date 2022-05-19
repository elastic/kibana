/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { Event } from '@kbn/analytics-client';
import { OpsMetrics } from '@kbn/core/server';
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
      // properties assertions.
      // Note: Once we implement schema and collector event validation, we can rely on ts to verify the shape
      const osMetricsProperties = [
        'collected_at',
        'process',
        'processes',
        'os',
        'response_times',
        'requests',
        'concurrent_connections',
      ];
      expect(initialEvent.event_type).to.eql('core-ops_metrics');

      osMetricsProperties.forEach((prop) => expect(initialEvent.properties).to.have.property(prop));
    });

    it('should emit events with updated ops metrics', () => {
      const initialOsProperties = initialEvent.properties.os as OpsMetrics['os'];
      const thirdOsProperties = thirdEvent.properties.os as OpsMetrics['os'];

      expect(initialEvent.properties.collected_at).not.to.eql(thirdEvent.properties.collected_at);
      // we can be fairly certain that at least the os load will have changed after startup.
      expect(initialOsProperties.load).not.to.eql(thirdOsProperties.load);
      expect(initialOsProperties.platform).to.eql(thirdOsProperties.platform);
    });

    it('should not send a huge json file', () => {
      [initialEvent, secondEvent, thirdEvent].forEach((event: Event) => {
        expect(Buffer.byteLength(JSON.stringify(event))).to.be.lessThan(5000);
      });
    });
  });
}

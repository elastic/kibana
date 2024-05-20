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
    let currentEvent: Event<Record<string, unknown>>;

    before(async () => {
      [currentEvent] = await ebtServerHelper.getEvents(1, {
        eventTypes: ['core-overall_status_changed'],
      });
    });

    it('should emit an initial event with the context set to `initializing`', async () => {
      const initialEvent = currentEvent;
      expect(initialEvent.event_type).to.eql('core-overall_status_changed');
      expect(initialEvent.context.overall_status_level).to.eql('initializing');
      expect(initialEvent.context.overall_status_summary).to.eql('Kibana is starting up');
    });

    it('should emit an event with status `available` eventually', async () => {
      const isAvailable = (ev: Event<Record<string, unknown>>) =>
        ev.properties.overall_status_level === 'available';

      for (let i = 2; i <= 10 && !isAvailable(currentEvent); ++i) {
        currentEvent = (
          await ebtServerHelper.getEvents(i, {
            eventTypes: ['core-overall_status_changed'],
          })
        ).pop()!;
      }

      // at this point, Kibana is NOT available after 10 emissions!
      expect(isAvailable(currentEvent)).to.eql(true);
    });
  });
}

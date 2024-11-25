/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../services';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ebtUIHelper = getService('kibana_ebt_ui');
  const browser = getService('browser');
  const { common } = getPageObjects(['common']);

  describe('Event "viewport_resize"', () => {
    beforeEach(async () => {
      // Navigating to `home` with the Welcome prompt because some runs were flaky
      // as we handle the Welcome screen only if the login prompt pops up.
      // Otherwise, it stays in the Welcome screen :/
      await common.navigateToApp('home');
    });

    it('should emit a "viewport_resize" event when the browser is resized', async () => {
      let preResizeTs = new Date().toISOString();
      const events = await ebtUIHelper.getEvents(Infinity, {
        eventTypes: ['viewport_resize'],
        withTimeoutMs: 100,
      });
      if (events.length) {
        const lastEvent = events.pop()!;
        preResizeTs = lastEvent.timestamp;
      }

      // Resize the window
      await browser.setWindowSize(500, 500);
      const { height, width } = await browser.getWindowSize();
      expect(height).to.eql(500);
      expect(width).to.eql(500);

      const actualInnerHeight = await browser.execute(() => window.innerHeight);
      expect(actualInnerHeight <= height).to.be(true); // The address bar takes some space when not running on HEADLESS

      const [event] = await ebtUIHelper.getEvents(1, {
        eventTypes: ['viewport_resize'],
        fromTimestamp: preResizeTs, // Fetch the event after a known TS
      });
      expect(event.event_type).to.eql('viewport_resize');
      expect(event.properties).to.eql({
        viewport_width: 500,
        viewport_height: actualInnerHeight,
      });

      // Validating that the context is also updated
      expect(event.context.viewport_width).to.be(500);
      expect(event.context.viewport_height).to.be(actualInnerHeight);
    });
  });
}

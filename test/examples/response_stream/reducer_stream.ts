/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('useReducer stream example', () => {
    it('navigates to the example', async () => {
      await testSubjects.click('ndjson-usereducer-stream');

      await retry.try(async () => {
        expect(await testSubjects.getVisibleText('responseStreamPageTitle')).to.be(
          'NDJSON useReducer stream'
        );
        expect(await testSubjects.getVisibleText('responseStreamProgressBadge')).to.be('0%');
        expect(await testSubjects.getVisibleText('responseStreamStatusMessage')).to.be(
          'Development did not start yet.'
        );
      });
    });

    it('starts the stream', async () => {
      await testSubjects.click('responseStreamStartButton');

      await retry.try(async () => {
        expect(await testSubjects.getVisibleText('responseStreamProgressBadge')).not.to.be('0%');
        expect(await testSubjects.getVisibleText('responseStreamStatusMessage')).to.be(
          'Development is ongoing, the hype is real!'
        );
      });
    });

    it('finishes the stream', async () => {
      await retry.tryForTime(60000, async () => {
        expect(await testSubjects.getVisibleText('responseStreamProgressBadge')).to.be('100%');
        expect(await testSubjects.getVisibleText('responseStreamStatusMessage')).to.be(
          'Development completed, the release got out the door!'
        );
      });
    });
  });
}

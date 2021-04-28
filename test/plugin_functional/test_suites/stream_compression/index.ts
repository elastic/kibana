/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const deployment = getService('deployment');

  describe('stream compression API', function () {
    it('should get streamed content immediately', async () => {
      const path = '/app/stream_compression';
      const url = `${deployment.getHostPort()}${path}`;
      await browser.navigateTo(url);
      await testSubjects.find('endOfStream', 60_000);

      const chunkElements = await testSubjects.findAll('streamChunk');
      expect(chunkElements.length).to.be(10);

      for (let index = 0; index < chunkElements.length; index++) {
        const chunkElement = chunkElements[index];
        expect(await chunkElement.getVisibleText()).to.be(index.toString().repeat(1_000));
      }
    });
  });
}

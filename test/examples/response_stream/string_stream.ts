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

  describe('string stream example', () => {
    it('navigates to the example', async () => {
      await testSubjects.click('simple-string-stream');

      await retry.try(async () => {
        expect(await testSubjects.getVisibleText('responseStreamPageTitle')).to.be(
          'Simple string stream'
        );
        expect(await testSubjects.exists('responseStreamStartButton')).to.be(true);
        expect(await testSubjects.getVisibleText('responseStreamString')).to.be('');
      });
    });

    it('starts the stream', async () => {
      await testSubjects.click('responseStreamStartButton');

      await retry.try(async () => {
        expect(await testSubjects.getVisibleText('responseStreamString')).not.to.be('');
      });
    });

    it('finishes the stream', async () => {
      await retry.tryForTime(60000, async () => {
        expect(await testSubjects.getVisibleText('responseStreamString')).to.be(
          'Elasticsearch is a search engine based on the Lucene library. It provides a distributed, multitenant-capable full-text search engine with an HTTP web interface and schema-free JSON documents. Elasticsearch is developed in Java and is dual-licensed under the source-available Server Side Public License and the Elastic license, while other parts fall under the proprietary (source-available) Elastic License. Official clients are available in Java, .NET (C#), PHP, Python, Apache Groovy, Ruby and many other languages. According to the DB-Engines ranking, Elasticsearch is the most popular enterprise search engine.'
        );
      });
    });
  });
}

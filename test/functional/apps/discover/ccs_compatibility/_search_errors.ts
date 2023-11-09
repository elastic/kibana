/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const config = getService('config');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  const isCcsTest = config.get('esTestCluster.ccs');
  const defaultIndex = isCcsTest ? 'ftr-remote:logstash-*' : 'logstash-*';

  describe('discover search errors', () => {
    it('exception on single shard shows warning and results', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern(defaultIndex);
      await retry.try(async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('4,731');
      });
      await filterBar.addDslFilter(`
      {
        "query": {
          "error_query": {
            "indices": [
              {
                "name": "${defaultIndex.slice(0, defaultIndex.length - 1)}2015.09.20",
                "error_type": "exception",
                "message": "'Watch out!'"
              }
            ]
          }
        }
      }`);

      // Ensure documents are still returned for the successful shards
      await retry.try(async function tryingForTime() {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('612');
      });

      // Ensure a warning is shown
      await testSubjects.exists('searchResponseWarningsCallout');
    });

    it('exception on all shards shows error', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern(defaultIndex);
      await retry.try(async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be('4,731');
      });
      await filterBar.addDslFilter(`
      {
        "query": {
          "error_query": {
            "indices": [
              {
                "name": "${defaultIndex}",
                "error_type": "exception",
                "message": "'Watch out!'"
              }
            ]
          }
        }
      }`);

      // Ensure an error is shown
      await testSubjects.exists('searchResponseWarningsEmptyPrompt');
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const { common, visualize } = getPageObjects(['common', 'visualize']);

  describe('data-shared-item', function indexPatternCreation() {
    before(async function () {
      await visualize.initTests();
      log.debug('navigateToApp visualize');
      await common.navigateToApp('visualize');
    });

    it('should have the correct data-shared-item title and description, and sharedItemContainer should exist', async function () {
      const expected = {
        title: 'Shared-Item Visualization AreaChart',
        description: 'AreaChart',
      };

      await visualize.openSavedVisualization('Shared-Item Visualization AreaChart');
      await retry.try(async function () {
        const { title, description } = await common.getSharedItemTitleAndDescription();
        expect(title).to.eql(expected.title);
        expect(description).to.eql(expected.description);
        const sharedItemContainers = await common.getSharedItemContainers();
        expect(sharedItemContainers.length).to.be(1);
      });
    });
  });
}

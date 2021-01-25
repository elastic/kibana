/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize']);

  describe('data-shared-item', function indexPatternCreation() {
    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToApp('visualize');
    });

    it('should have the correct data-shared-item title and description, and sharedItemContainer should exist', async function () {
      const expected = {
        title: 'Shared-Item Visualization AreaChart',
        description: 'AreaChart',
      };

      await PageObjects.visualize.openSavedVisualization('Shared-Item Visualization AreaChart');
      await retry.try(async function () {
        const { title, description } = await PageObjects.common.getSharedItemTitleAndDescription();
        expect(title).to.eql(expected.title);
        expect(description).to.eql(expected.description);
        const sharedItemContainers = await PageObjects.common.getSharedItemContainers();
        expect(sharedItemContainers.length).to.be(1);
      });
    });
  });
}

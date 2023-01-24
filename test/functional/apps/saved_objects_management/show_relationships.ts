/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'settings', 'savedObjects']);

  describe('saved objects relationships flyout', () => {
    beforeEach(async () => {
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/saved_objects_management/show_relationships'
      );
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('displays the invalid references', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();

      const objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('Dashboard with missing refs')).to.be(true);

      await PageObjects.savedObjects.clickRelationshipsByTitle('Dashboard with missing refs');

      const invalidRelations = await PageObjects.savedObjects.getInvalidRelations();

      expect(invalidRelations).to.eql([
        {
          error: 'Saved object [visualization/missing-vis-ref] not found',
          id: 'missing-vis-ref',
          relationship: 'Child',
          type: 'visualization',
        },
        {
          error: 'Saved object [dashboard/missing-dashboard-ref] not found',
          id: 'missing-dashboard-ref',
          relationship: 'Child',
          type: 'dashboard',
        },
      ]);
    });
  });
}

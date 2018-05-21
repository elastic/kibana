// Smokescreen tests for core migration logic

import _ from 'lodash';
import { assert } from 'chai';
import { Migration } from '@kbn/migrations';
import { migrationTest, catPlugin, dogPlugin } from './test_helpers';

export default function ({ getService }) {
  const es = getService('es');
  const callCluster = (path, ...args) => _.get(es, path).call(es, ...args);
  const helper = migrationTest(callCluster);
  const opts = {
    callCluster,
    index: '.test-migrations',
    log: _.noop,
    elasticVersion: '9.8.7',
    plugins: [],
  };

  describe('Kibana index migration', () => {
    before(() => callCluster('indices.delete', { index: '.migrate-*' }));

    it('Migrates an existing index that has never been migrated before', async () => {
      const index = '.migrate-existing';
      await helper.createUnmigratedIndex({ index, indexDefinition: [catPlugin.V0, dogPlugin.V0] });
      const migrationResult = await Migration.migrate({
        ...opts,
        index,
        plugins: [catPlugin.V2.plugin, dogPlugin.V2.plugin],
      });
      await helper.waitForMigration({ index, migrationResult, minDocs: 3 });
      await helper.assertValidMigrationState({
        index,
        expectedTypes: [{
          type: 'cat',
          checksum: '8415a3bb',
          migrationIds: ['cat-ensure-action', 'cat-seed', 'cat-add-name', 'cat-actions'],
        }, {
          type: 'dog',
          checksum: '74ac450b',
          migrationIds: ['dog-seed', 'dog-add-eats', 'dog-does'],
        }],
      });
      await helper.assertDocument({ index, doc: catPlugin.V2.docs.transformedSeed  });
      await helper.assertDocument({ index, doc: catPlugin.V2.docs.transformedOriginal });
      await helper.assertDocument({ index, doc: dogPlugin.V2.docs.transformedSeed  });
      await helper.assertDocument({ index, doc: dogPlugin.V2.docs.transformedOriginal });
    });

    it('Migrates a previously migrated index, if migrations change', async () => {
      const index = '.migrate-previous';
      const firstMigration = await Migration.migrate({
        ...opts,
        index,
        plugins: [catPlugin.V1.plugin, dogPlugin.V1.plugin],
      });
      await helper.waitForMigration({ index, migrationResult: firstMigration });
      await helper.assertValidMigrationState({
        index,
        expectedTypes: [{
          type: 'cat',
          checksum: '9308bb75',
          migrationIds: ['cat-ensure-action', 'cat-seed', 'cat-add-name'],
        }, {
          type: 'dog',
          checksum: '7d045eb4',
          migrationIds: ['dog-seed', 'dog-add-eats'],
        }]
      });

      const secondMigration = await Migration.migrate({
        ...opts,
        index,
        plugins: [catPlugin.V2.plugin],
      });
      await helper.waitForMigration({ index, migrationResult: secondMigration });
      const migrationState = await helper.assertValidMigrationState({
        index,
        expectedTypes: [{
          checksum: '8415a3bb',
          type: 'cat',
          migrationIds: ['cat-ensure-action', 'cat-seed', 'cat-add-name', 'cat-actions'],
        }, {
          checksum: '7d045eb4',
          type: 'dog',
          migrationIds: ['dog-seed', 'dog-add-eats'],
        }],
      });

      assert.equal(firstMigration.destIndex, migrationState.previousIndex);
      assert.notEqual(firstMigration.destIndex, secondMigration.destIndex);

      await helper.assertAlias({ alias: index, migrationResult: secondMigration });
      await helper.assertDocument({ index, doc: catPlugin.V2.docs.transformedSeed });
      await helper.assertDocument({ index, doc: dogPlugin.V1.docs.transformedSeed });
      await helper.assertDocument({ index: migrationState.previousIndex, doc: catPlugin.V1.docs.transformedSeed });
      await helper.assertDocument({ index: migrationState.previousIndex, doc: dogPlugin.V1.docs.transformedSeed });
    });
  });
}

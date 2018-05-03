import { assert } from 'chai';
import _ from 'lodash';
import { Migration } from '@kbn/migrations';
import { waitUntilExists } from './test_helpers';

export function migrateNonexistantIndexTest({ callCluster }) {
  it('creates and seeds index if index does not exist', async () => {
    const index = '.test-nonexistant';
    const plugin = {
      id: 'migratetest',
      mappings: {
        migratetest: {
          properties: {
            name: { type: 'keyword' },
          },
        },
      },
      migrations: [{
        id: 'm1',
        seed: () => ({
          id: 'aseedforyou',
          type: 'migratetest',
          attributes: {
            name: 'Carlos',
          },
        }),
      }, {
        id: 'm2',
        filter: ({ type }) => type === 'migratetest',
        transform: (doc) => _.set(doc, 'attributes.name', `${doc.attributes.name} Santana`),
      }],
    };
    const result = await Migration.migrate({ callCluster, index, log: _.noop, elasticVersion: '9.8.7', plugins: [plugin] });

    await waitUntilExists(() => callCluster('get', { index, type: 'doc', id: 'migratetest:aseedforyou' }));

    const { _source: { migration } } = await callCluster('get', { index, type: 'doc', id: 'migration:migration-state' });
    const migratedDoc = await callCluster('get', { index, type: 'doc', id: 'migratetest:aseedforyou' });

    assert.equal(migration.plugins.length, 1);
    assert.deepEqual(migration.plugins[0].migrationIds, ['m1', 'm2']);
    assert.deepEqual(JSON.parse(migration.plugins[0].mappings), plugin.mappings);
    assert.equal(result.status, 'migrated');
    assert.equal(result.destIndex, '.test-nonexistant-9.8.7-5f2fe1af2633e6b3282d1839e58581bd655b7795');
    assert.deepEqual(_.pick(migratedDoc, ['_id', '_source']), {
      _id: 'migratetest:aseedforyou',
      _source: {
        type: 'migratetest',
        migratetest: { name: 'Carlos Santana' },
      },
    });
  });
}

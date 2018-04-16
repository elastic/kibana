import { assert } from 'chai';
import _ from 'lodash';
import { migrate } from '@kbn/migrations';
import { mockKbnServer, waitUntilExists } from './test_helpers';

export function migrateNonexistantIndexTest({ callWithInternalUser }) {
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
    const kbnServer = mockKbnServer(callWithInternalUser);
    const result = await migrate({ kbnServer, index, plugins: [plugin] });

    await waitUntilExists(() => callWithInternalUser('get', { index, type: 'doc', id: 'migratetest:aseedforyou' }));

    const { _source: { migration } } = await callWithInternalUser('get', { index, type: 'doc', id: 'migration:migration-state' });
    const migratedDoc = await callWithInternalUser('get', { index, type: 'doc', id: 'migratetest:aseedforyou' });

    assert.equal(migration.plugins.length, 1);
    assert.deepEqual(migration.plugins[0].migrationIds, ['m1', 'm2']);
    assert.deepEqual(JSON.parse(migration.plugins[0].mappings), plugin.mappings);
    assert.equal(result.status, 'migrated');
    assert.equal(result.destIndex, '.test-nonexistant-9.8.7-original');
    assert.deepEqual(_.pick(migratedDoc, ['_id', '_source']), {
      _id: 'migratetest:aseedforyou',
      _source: {
        type: 'migratetest',
        migratetest: { name: 'Carlos Santana' },
      },
    });
  });
}

import { assert } from 'chai';
import _ from 'lodash';
import { migrate } from '@kbn/migrations';
import { waitUntilExists } from './test_helpers';

export function migrateOldIndexTest({ callCluster }) {
  it('Migrates an existing index that has never been migrated before', async () => {
    const index = '.test-existing';
    const plugin = {
      id: 'somemuzaknstuff',
      mappings: {
        muzak: {
          properties: {
            track: { type: 'text' },
            album: { type: 'text' },
          },
        },
      },
      migrations: [{
        id: 'add_mars',
        seed: () => ({
          id: 'mars',
          type: 'muzak',
          attributes: {
            track: 'From Yesterday',
            album: 'A Beautiful Lie',
          },
        }),
      }, {
        id: 'ensure_album',
        filter: ({ type, attributes: { album } }) => type === 'muzak' && !album,
        transform: (doc) => _.set(doc, 'attributes.album', 'N/A'),
      }],
    };

    await callCluster('indices.create', {
      index,
      body: {
        mappings: {
          doc: {
            dynamic: 'strict',
            properties: {
              type: { type: 'keyword' },
              muzak: {
                properties: {
                  track: { type: 'text' },
                },
              },
            },
          },
        },
        settings: {
          index: {
            number_of_shards: index.number_of_shards,
            number_of_replicas: index.number_of_replicas,
          },
        },
      },
    });

    await callCluster('create', {
      index,
      type: 'doc',
      id: 'muzak:jessecook',
      refresh: 'true',
      body: {
        type: 'muzak',
        muzak: { track: 'Mario Takes A Walk' },
      },
    });

    await waitUntilExists(() => callCluster('get', { index, type: 'doc', id: 'muzak:jessecook' }));

    const { destIndex } = await migrate({ callCluster, index, log: _.noop, elasticVersion: '9.8.7', plugins: [plugin] });

    await waitUntilExists(() => callCluster('get', { index, type: 'doc', id: 'muzak:mars' }));

    const alias = await callCluster('indices.getAlias', { name: index });
    const { _source: { migration } } = await callCluster('get', { index, type: 'doc', id: 'migration:migration-state' });
    const jesseCook = await callCluster('get', { index, type: 'doc', id: 'muzak:jessecook' });
    const mars = await callCluster('get', { index: destIndex, type: 'doc', id: 'muzak:mars' });
    const originalDoc = await callCluster('get', { index: `${index}-9.8.7-original`, type: 'doc', id: 'muzak:jessecook' });

    assert.equal(migration.plugins.length, 1);
    assert.deepEqual(migration.plugins[0].migrationIds, ['add_mars', 'ensure_album']);
    assert.deepEqual(JSON.parse(migration.plugins[0].mappings), plugin.mappings);
    assert.equal(jesseCook._source.muzak.album, 'N/A');
    assert.equal(mars._source.muzak.album, 'A Beautiful Lie');
    assert.deepEqual(alias[destIndex], { aliases: { [index]: {} } });
    assert.deepEqual(originalDoc._source, { type: 'muzak', muzak: { track: 'Mario Takes A Walk' } });
  });
}

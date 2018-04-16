import { assert } from 'chai';
import _ from 'lodash';
import { migrate } from '@kbn/migrations';
import { waitUntilExists } from './test_helpers';

export function migrateExistingTest({ callCluster }) {
  it('Migrates a previously migrated index, if migrations change', async () => {
    const index = '.test-previous';

    const pluginsV1 = [{
      id: 'user',
      mappings: _.set({}, 'user.properties.name.type', 'text'),
      migrations: [{
        id: 'make_admin_user',
        seed: () => ({
          id: 'admin',
          type: 'user',
          attributes: { name: 'admin' },
        }),
      }, {
        id: 'prefix_user_names',
        filter: ({ type }) => type === 'user',
        transform: (doc) => _.set(doc, 'attributes.name', `u_${doc.attributes.name}`),
      }],
    }, {
      id: 'books',
      mappings: _.set({}, 'book.properties.title.type', 'text'),
      migrations: [{
        id: 'free_book',
        seed: () => ({
          id: 'lyonsulgard',
          type: 'book',
          attributes: { title: `Lyonesse: Suldrun's Garden` },
        }),
      }, {
        id: 'caps',
        filter: ({ type }) => type === 'book',
        transform: (doc) => _.set(doc, 'attributes.title', doc.attributes.title.toUpperCase()),
      }],
    }];

    const pluginsV2 = [{
      ...pluginsV1[0],
      mappings: _.set(_.cloneDeep(pluginsV1[0].mappings), 'user.properties.city.type', 'text'),
      migrations: [
        ...pluginsV1[0].migrations,
        {
          id: 'ensure_city',
          filter: ({ type }) => type === 'user',
          transform: (doc) => _.set(doc, 'attributes.city', 'Somewhere'),
        },
      ],
    }, {
      ...pluginsV1[1],
      mappings: _.set(_.cloneDeep(pluginsV1[1].mappings), 'book.properties.author.type', 'text'),
      migrations: [
        ...pluginsV1[1].migrations,
        {
          id: 'add_author',
          filter: ({ type }) => type === 'book',
          transform: (doc) => _.set(doc, 'attributes.author', 'Jack Vance'),
        },
      ],
    }];

    await migrate({ callCluster, index, log: _.noop, elasticVersion: '9.8.7', plugins: pluginsV1 });
    await waitUntilExists(() => callCluster('cat.count', { index, format: 'json' }).then(([{ count }]) => parseInt(count) === 3));
    await waitUntilExists(() => callCluster('get', { index, type: 'doc', id: 'migration:migration-state' }));

    const { destIndex } = await migrate({ callCluster, index, log: _.noop, elasticVersion: '9.8.7', plugins: pluginsV2 });

    await waitUntilExists(() => callCluster('indices.getAlias', { name: index }).then((alias) => alias[destIndex]));
    await waitUntilExists(() => callCluster('cat.count', { index, format: 'json' }).then(([{ count }]) => parseInt(count) === 3));

    const alias = await callCluster('indices.getAlias', { name: index });
    const { _source: { migration } } = await callCluster('get', { index, type: 'doc', id: 'migration:migration-state' });
    const book = await callCluster('get', { index, type: 'doc', id: 'book:lyonsulgard' });
    const admin = await callCluster('get', { index, type: 'doc', id: 'user:admin' });
    const originalBook = await callCluster('get', { index: `${index}-9.8.7-original`, type: 'doc', id: 'book:lyonsulgard' });
    const originalAdmin = await callCluster('get', { index: `${index}-9.8.7-original`, type: 'doc', id: 'user:admin' });

    assert.equal(migration.plugins.length, 2);
    assert.deepEqual(migration.plugins[0].migrationIds, ['make_admin_user', 'prefix_user_names', 'ensure_city']);
    assert.deepEqual(migration.plugins[1].migrationIds, ['free_book', 'caps', 'add_author']);
    assert.deepEqual(JSON.parse(migration.plugins[0].mappings), pluginsV2[0].mappings);
    assert.deepEqual(JSON.parse(migration.plugins[1].mappings), pluginsV2[1].mappings);
    assert.deepEqual(book._source, {
      type: 'book',
      book: {
        title: `LYONESSE: SULDRUN'S GARDEN`,
        author: 'Jack Vance',
      },
    });
    assert.deepEqual(admin._source, {
      type: 'user',
      user: {
        name: 'u_admin',
        city: 'Somewhere',
      },
    });
    assert.deepEqual(alias[destIndex], { aliases: { [index]: {} } });
    assert.deepEqual(originalBook._source, {
      type: 'book',
      book: {
        title: `LYONESSE: SULDRUN'S GARDEN`,
      },
    });
    assert.deepEqual(originalAdmin._source, {
      type: 'user',
      user: {
        name: 'u_admin',
      },
    });
  });
}

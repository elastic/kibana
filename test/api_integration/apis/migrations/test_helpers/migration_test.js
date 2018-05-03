import { assert } from 'chai';
import _ from 'lodash';

export function migrationTest(callCluster) {
  function fetchMigrationState(index) {
    return callCluster('get', { index, type: 'doc', id: 'migration:migration-state' });
  }

  function fetchAlias(name) {
    return callCluster('indices.getAlias', { name });
  }

  function waitForDocs(index, minDocs) {
    return waitUntilExists(() => callCluster('count', { index }).then(({ count }) => parseInt(count) >= minDocs));
  }

  return {
    async waitForMigration({ index, migrationResult: { destIndex }, minDocs = 3 }) {
      await waitUntilExists(() => fetchAlias(index).then((alias) => alias[destIndex]));
      await waitForDocs(destIndex, minDocs);
      await waitUntilExists(() => fetchMigrationState(destIndex));
    },

    async createUnmigratedIndex({ index, indexDefinition }) {
      await callCluster('indices.create', {
        index,
        body: {
          mappings: {
            doc: {
              dynamic: 'strict',
              properties: Object.assign({ type: { type: 'keyword' }, }, ..._.map(indexDefinition, 'mappings')),
            },
          },
        },
      });

      const docs = _(indexDefinition)
        .map(d => d.insertDocs)
        .flatten();

      await callCluster('bulk', {
        body: docs
          .map(({ _id, _source }) => ([
            { index: { _index: index, _type: 'doc', _id } },
            _source,
          ]))
          .flatten()
          .value(),
      });

      await waitForDocs(index, docs.value().length);
    },

    async assertValidMigrationState({ index, plugins }) {
      const { _source: { migration: migrationState } } = await fetchMigrationState(index);
      const expectedPlugins = _.sortBy(plugins, 'id');
      const actualPlugins = _.sortBy(migrationState.plugins, 'id');

      assert.equal(migrationState.status, 'migrated');
      assert.isOk(migrationState.previousIndex);
      assert.deepEqual(
        actualPlugins.map(p => _.pick(p, ['id', 'migrationIds'])),
        expectedPlugins.map(({ id, migrations }) => ({ id, migrationIds: migrations.map(m => m.id) })),
      );
      assert.deepEqual(
        actualPlugins.map(({ mappings }) => JSON.parse(mappings)),
        expectedPlugins.map(({ mappings }) => mappings),
      );

      return migrationState;
    },

    async assertAlias({ alias, migrationResult: { destIndex } }) {
      const aliasDoc = await fetchAlias(alias);
      assert.deepEqual(aliasDoc[destIndex], { aliases: { [alias]: {} } });
    },

    async assertDocument({ index, doc }) {
      const actual = await callCluster('get', { index, type: 'doc', id: doc.id });
      assert.deepEqual(actual._source, doc.source);
    },
  };
}

// Super hacky... Need to look for a better way to accomplish this...
// When we write to Elastic, we can't always query it immediately, as
// the written document is not always immediately available. waitForActiveShards='all',
// however, times out. So, this is the interim solution.
export async function waitUntilExists(fn, count = 0) {
  const result = await checkExists(fn);
  if (!result.error) {
    return result;
  }
  if (count > 100) {
    throw result.error;
  }
  return new Promise(resolve => setTimeout(resolve, 100))
    .then(() => waitUntilExists(fn, count + 1));
}

async function checkExists(fn) {
  try {
    const result = await fn();
    return result || { error: new Error('Failed to wait for migration') };
  } catch (error) {
    if (error.statusCode === 404) {
      return { error };
    } else {
      throw error;
    }
  }
}

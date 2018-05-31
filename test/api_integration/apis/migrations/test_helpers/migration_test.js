/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { assert } from 'chai';
import _ from 'lodash';

export function migrationTest(callCluster) {
  function fetchMigrationState(index) {
    return callCluster('get', { index, type: 'doc', id: 'migration:migration-state' });
  }

  function fetchAlias(name) {
    return callCluster('indices.getAlias', { name });
  }

  return {
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

      await callCluster('indices.refresh', { index });
    },

    async assertValidMigrationState({ index, expectedTypes }) {
      const { _source: { migration: migrationState } } = await fetchMigrationState(index);

      assert.equal(migrationState.status, 'migrated');
      assert.isOk(migrationState.previousIndex);

      assert.deepEqual(
        expectedTypes,
        migrationState.types,
        `EXPECTED ${JSON.stringify(migrationState.types)} to equal ${JSON.stringify(expectedTypes)}`
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

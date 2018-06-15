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
import {
  migrateIndex,
  SavedObjectDoc,
} from '../../../../src/server/saved_objects/migrations/core';

export default function({ getService }: { getService: any }) {
  const es = getService('es');
  const callCluster = (path, ...args) =>
    (_.get(es, path) as any).call(es, ...args);
  const opts = {
    callCluster,
    dropUnsupportedTypes: true,
    index: '.test-migrations',
    kibanaVersion: '42.8.7',
    log: _.noop,
    plugins: [],
  };

  describe('Kibana index migration', () => {
    beforeEach(async () => await deleteTestIndices());

    it('skips migrations if the index does not exist', async () => {
      const result = await migrateIndex(opts);
      const numIndices = await countIndices();
      assert.equal(numIndices, 0);
      assert.deepEqual(result, {
        reason: `Index ".test-migrations" does not exist.`,
        status: 'skipped',
      });
    });

    it('skips migrations if the index is up to date', async () => {
      await createIndex({
        body: {
          aliases: { '.test-migrations': {} },
        },
        index: '.test-migrations-42',
      });
      const result = await migrateIndex(opts);
      const numIndices = await countIndices();
      assert.equal(numIndices, 1);
      assert.deepEqual(result, {
        reason: `Alias ".test-migrations" is already migrated.`,
        status: 'skipped',
      });
    });

    it('fails if the index is newer than Kibana', async () => {
      await createIndex({
        body: {
          aliases: { '.test-migrations': {} },
          mappings: {
            doc: {
              _meta: { kibanaVersion: '99.0.0' },
              dynamic: 'strict',
              properties: {
                baz: { type: 'text' },
              },
            },
          },
        },
        index: '.test-migrations-stuffness',
      });
      const result = await migrateIndex(opts);
      const numIndices = await countIndices();
      assert.equal(numIndices, 1);
      assert.deepEqual(result, {
        details: {
          code: 'indexNewer',
          indexVersion: '99.0.0',
          kibanaVersion: '42.8.7',
        },
        reason: `Index ".test-migrations v99.0.0" is newer than Kibana (v42.8.7).`,
        status: 'failed',
      });
    });

    it('fails if the destination index already exists', async () => {
      await createIndex({ index: '.test-migrations' });
      await createIndex({
        body: {
          mappings: {
            doc: {
              _meta: { kibanaVersion: opts.kibanaVersion },
              dynamic: 'strict',
              properties: {
                baz: { type: 'text' },
              },
            },
          },
        },
        index: '.test-migrations-42',
      });
      const result = await migrateIndex(opts);
      const numIndices = await countIndices();
      assert.equal(numIndices, 2);
      assert.deepEqual(result, {
        details: {
          code: 'indexExists',
          index: '.test-migrations-42',
        },
        reason: `Index ".test-migrations-42" already exists.`,
        status: 'failed',
      });
    });

    it('fails if the index contains unsupported types, and dropUnsupportedTypes is not specified', async () => {
      const result = await testDroppingDocs({ dropUnsupportedTypes: false });
      const numIndices = await countIndices();
      assert.equal(numIndices, 1);
      assert.deepEqual(result, {
        details: {
          code: 'unsupporedTypes',
          typeCounts: { aaa: 2 },
        },
        reason: `The index contains unsupported types aaa.`,
        status: 'failed',
      });
    });

    // Migrations aren't super fast, so we are batching a number of tests into
    // this one smokescreen.
    it('migrates all docs', async () => {
      await createIndex({ index: '.test-migrations' });
      await createDoc({
        attributes: { name: 'Georgia' },
        id: 'a1',
        type: 'aaa',
      });
      await createDoc({
        attributes: { name: 'South Carolina' },
        id: 'a2',
        type: 'aaa',
      });
      await createDoc({
        attributes: { desc: 'South East USA' },
        id: 'b1',
        type: 'bbb',
      });
      await refreshIndex();

      const plugins = [
        {
          id: 'a-plugin',
          mappings: {
            aaa: {
              properties: {
                name: { type: 'keyword' },
              },
            },
          },
          migrations: {
            aaa: {
              '6': doc =>
                _.set(
                  doc,
                  'attributes.name',
                  doc.attributes.name.toUpperCase()
                ) as SavedObjectDoc,
            },
          },
        },
        {
          id: 'b-plugin',
          mappings: {
            bbb: {
              properties: {
                desc: { type: 'keyword' },
                fiver: { type: 'text' },
              },
            },
          },
          migrations: {
            bbb: {
              '5': doc =>
                _.set(doc, 'attributes.fiver', '5!') as SavedObjectDoc,
              '6': doc =>
                _.set(
                  doc,
                  'attributes.desc',
                  `${doc.attributes.desc} six`
                ) as SavedObjectDoc,
            },
          },
        },
      ];

      const startTime = Date.now();
      const result = await migrateIndex({
        ...opts,
        plugins,
      });
      const numIndices = await countIndices();
      const mappings = await callCluster('indices.getMapping', {
        index: '.test-migrations',
      });
      assert.equal(numIndices, 2);

      // Hacky way to sort of indicate that we are measuring elaspsed ms
      assert.closeTo(
        _.get(result, 'details.elapsedMs'),
        Date.now() - startTime,
        100
      );

      assert.equal(result.status, 'success');
      assert.deepEqual(_.omit(_.get(result, 'details'), 'elapsedMs'), {
        destIndex: '.test-migrations-42',
        docsDropped: 0,
        docsMigrated: 3,
      });

      // Make sure we store the kibanaVersion in the mappings after migration
      assert.equal(
        _.get(_.first(_.values(mappings)), 'mappings.doc._meta.kibanaVersion'),
        opts.kibanaVersion
      );

      // Ensure the docs were actually transformed
      assert.deepEqual(await allDocs(), {
        'aaa:a1': {
          aaa: {
            name: 'GEORGIA',
          },
          migrationVersion: 42,
          type: 'aaa',
        },
        'aaa:a2': {
          aaa: {
            name: 'SOUTH CAROLINA',
          },
          migrationVersion: 42,
          type: 'aaa',
        },
        'bbb:b1': {
          bbb: {
            desc: 'South East USA six',
            fiver: '5!',
          },
          migrationVersion: 42,
          type: 'bbb',
        },
      });
    });

    // Again, bundling several tests into one to cut down on run time
    it('allows dropping and renaming of types', async () => {
      const result = await testDroppingDocs({ dropUnsupportedTypes: true });
      const numIndices = await countIndices();
      const mappings = await callCluster('indices.getMapping', {
        index: '.test-migrations',
      });
      assert.equal(numIndices, 2);
      assert.equal(result.status, 'success');
      assert.deepEqual(_.omit(_.get(result, 'details'), 'elapsedMs'), {
        destIndex: '.test-migrations-42',
        docsDropped: 2,
        docsMigrated: 1,
      });

      // Make sure we store the kibanaVersion in the mappings after migration
      assert.isUndefined(
        _.get(_.first(_.values(mappings)), 'mappings.doc.properties.aaa')
      );

      // Ensure the docs were actually transformed
      assert.deepEqual(await allDocs(), {
        'ccc:b1': {
          ccc: {
            description: 'South East USA',
          },
          migrationVersion: 42,
          type: 'ccc',
        },
      });
    });

    async function testDroppingDocs({
      dropUnsupportedTypes,
    }: {
      dropUnsupportedTypes: boolean;
    }) {
      await createIndex({
        body: {
          mappings: { doc: { properties: { type: { type: 'keyword' } } } },
        },
        index: '.test-migrations',
      });
      await createDoc({
        attributes: { name: 'Georgia' },
        id: 'a1',
        type: 'aaa',
      });
      await createDoc({
        attributes: { name: 'South Carolina' },
        id: 'a2',
        type: 'aaa',
      });
      await createDoc({
        attributes: { desc: 'South East USA' },
        id: 'b1',
        type: 'bbb',
      });
      await refreshIndex();

      const plugins = [
        {
          id: 'b-plugin',
          mappings: {
            ccc: {
              properties: {
                description: { type: 'keyword' },
              },
            },
          },
          migrations: {
            bbb: {
              40: (doc: any) => _.set(doc, 'type', 'ccc') as any,
            },
            ccc: {
              41: (doc: any) =>
                _.set(doc, 'attributes', {
                  description: doc.attributes.desc,
                }) as any,
            },
          },
        },
      ];

      return await migrateIndex({
        ...opts,
        dropUnsupportedTypes,
        plugins,
      });
    }

    async function createDoc(doc: any) {
      await callCluster('create', {
        body: {
          type: doc.type,
          [doc.type]: doc.attributes,
        },
        id: `${doc.type}:${doc.id}`,
        index: '.test-migrations',
        type: 'doc',
      });
    }

    async function allDocs() {
      const result = await callCluster('search', {
        index: '.test-migrations',
        type: 'doc',
      });

      return _.mapValues(
        _.indexBy(
          result.hits.hits.map(doc => _.pick(doc, ['_id', '_source'])),
          '_id'
        ),
        (doc: any) => doc._source
      );
    }

    async function createIndex(definition: any) {
      await callCluster('indices.create', definition);
    }

    async function refreshIndex() {
      await callCluster('indices.refresh', { index: '.test-migrations*' });
    }

    async function countIndices() {
      const indices = await callCluster('cat.indices', {
        format: 'json',
        index: '.test-migrations*',
      });
      return indices.length;
    }

    async function deleteTestIndices() {
      await callCluster('indices.delete', { index: '.test-migrations*' });
    }
  });
}

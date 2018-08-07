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

/*
 * Smokescreen tests for core migration logic
 */

import _ from 'lodash';
import { assert } from 'chai';
import {
  DocumentMigrator,
  IndexMigrator,
} from '../../../../src/server/saved_objects/migrations/core';

export default ({ getService }) => {
  const es = getService('es');
  const callCluster = (path, ...args) => _.get(es, path).call(es, ...args);

  describe('Kibana index migration', () => {
    before(() => callCluster('indices.delete', { index: '.migrate-*' }));

    it('Migrates an existing index that has never been migrated before', async () => {
      const index = '.migration-a';
      const originalDocs = [
        { id: 'foo:a', type: 'foo', foo: { name: 'Foo A' } },
        { id: 'foo:e', type: 'foo', foo: { name: 'Fooey' } },
        { id: 'bar:i', type: 'bar', bar: { nomnom: 33 } },
        { id: 'bar:o', type: 'bar', bar: { nomnom: 2 } },
        { id: 'baz:u', type: 'baz', baz: { title: 'Terrific!' } },
      ];

      const mappingProperties = {
        foo: { properties: { name: { type: 'text' } } },
        bar: { properties: { mynum: { type: 'integer' } } },
      };

      const migrations = {
        foo: {
          '1.0.0': doc => _.set(doc, 'attributes.name', doc.attributes.name.toUpperCase()),
        },
        bar: {
          '1.0.0': doc => _.set(doc, 'attributes.nomnom', doc.attributes.nomnom + 1),
          '1.3.0': doc => _.set(doc, 'attributes', { mynum: doc.attributes.nomnom }),
          '1.9.0': doc => _.set(doc, 'attributes.mynum', doc.attributes.mynum * 2),
        },
      };

      await createIndex({ callCluster, index });
      await createDocs({ callCluster, index, docs: originalDocs });

      const result = await migrateIndex({ callCluster, index, migrations, mappingProperties });

      assert.deepEqual(_.omit(result, 'elapsedMs'), {
        destIndex: '.migration-a_2',
        sourceIndex: '.migration-a_1',
        status: 'migrated',
      });

      // The docs in the original index are unchanged
      assert.deepEqual(await fetchDocs({ callCluster, index: `${index}_1` }), [
        { id: 'foo:a', type: 'foo', foo: { name: 'Foo A' } },
        { id: 'foo:e', type: 'foo', foo: { name: 'Fooey' } },
        { id: 'bar:i', type: 'bar', bar: { nomnom: 33 } },
        { id: 'bar:o', type: 'bar', bar: { nomnom: 2 } },
        { id: 'baz:u', type: 'baz', baz: { title: 'Terrific!' } },
      ]);

      // The docs in the alias have been migrated
      assert.deepEqual(await fetchDocs({ callCluster, index }), [
        { id: 'foo:a', type: 'foo', migrationVersion: { foo: '1.0.0' }, foo: { name: 'FOO A' } },
        { id: 'foo:e', type: 'foo', migrationVersion: { foo: '1.0.0' }, foo: { name: 'FOOEY' } },
        { id: 'bar:i', type: 'bar', migrationVersion: { bar: '1.9.0' }, bar: { mynum: 68 } },
        { id: 'bar:o', type: 'bar', migrationVersion: { bar: '1.9.0' }, bar: { mynum: 6 } },
        { id: 'baz:u', type: 'baz', baz: { title: 'Terrific!' } },
      ]);
    });

    it('migrates a previously migrated index, if migrations change', async () => {
      const index = '.migration-b';
      const originalDocs = [
        { id: 'foo:a', type: 'foo', foo: { name: 'Foo A' } },
        { id: 'foo:e', type: 'foo', foo: { name: 'Fooey' } },
        { id: 'bar:i', type: 'bar', bar: { nomnom: 33 } },
        { id: 'bar:o', type: 'bar', bar: { nomnom: 2 } },
      ];

      const mappingProperties = {
        foo: { properties: { name: { type: 'text' } } },
        bar: { properties: { mynum: { type: 'integer' } } },
      };

      const migrations = {
        foo: {
          '1.0.0': doc => _.set(doc, 'attributes.name', doc.attributes.name.toUpperCase()),
        },
        bar: {
          '1.0.0': doc => _.set(doc, 'attributes.nomnom', doc.attributes.nomnom + 1),
          '1.3.0': doc => _.set(doc, 'attributes', { mynum: doc.attributes.nomnom }),
          '1.9.0': doc => _.set(doc, 'attributes.mynum', doc.attributes.mynum * 2),
        },
      };

      await createIndex({ callCluster, index });
      await createDocs({ callCluster, index, docs: originalDocs });

      await migrateIndex({ callCluster, index, migrations, mappingProperties });

      mappingProperties.bar.properties.name = { type: 'keyword' };
      migrations.foo['2.0.1'] = doc => _.set(doc, 'attributes.name', `${doc.attributes.name}v2`);
      migrations.bar['2.3.4'] = doc => _.set(doc, 'attributes.name', `NAME ${doc.id}`);

      await migrateIndex({ callCluster, index, migrations, mappingProperties });

      // The index for the initial migration has not been destroyed...
      assert.deepEqual(await fetchDocs({ callCluster, index: `${index}_2` }), [
        { id: 'foo:a', type: 'foo', migrationVersion: { foo: '1.0.0' }, foo: { name: 'FOO A' } },
        { id: 'foo:e', type: 'foo', migrationVersion: { foo: '1.0.0' }, foo: { name: 'FOOEY' } },
        { id: 'bar:i', type: 'bar', migrationVersion: { bar: '1.9.0' }, bar: { mynum: 68 } },
        { id: 'bar:o', type: 'bar', migrationVersion: { bar: '1.9.0' }, bar: { mynum: 6 } },
      ]);

      // The docs were migrated again...
      assert.deepEqual(await fetchDocs({ callCluster, index }), [
        { id: 'foo:a', type: 'foo', migrationVersion: { foo: '2.0.1' }, foo: { name: 'FOO Av2' } },
        { id: 'foo:e', type: 'foo', migrationVersion: { foo: '2.0.1' }, foo: { name: 'FOOEYv2' } },
        {
          id: 'bar:i',
          type: 'bar',
          migrationVersion: { bar: '2.3.4' },
          bar: { mynum: 68, name: 'NAME i' },
        },
        {
          id: 'bar:o',
          type: 'bar',
          migrationVersion: { bar: '2.3.4' },
          bar: { mynum: 6, name: 'NAME o' },
        },
      ]);
    });

    it('Coordinates migrations across the Kibana cluster', async () => {
      const index = '.migration-c';
      const originalDocs = [
        { id: 'foo:lotr', type: 'foo', foo: { name: 'Lord of the Rings' } },
      ];

      const mappingProperties = {
        foo: { properties: { name: { type: 'text' } } },
      };

      const migrations = {
        foo: {
          '1.0.0': doc => _.set(doc, 'attributes.name', 'LOTR'),
        },
      };

      await createIndex({ callCluster, index });
      await createDocs({ callCluster, index, docs: originalDocs });

      const result = await Promise.all([
        migrateIndex({ callCluster, index, migrations, mappingProperties }),
        migrateIndex({ callCluster, index, migrations, mappingProperties }),
      ]);

      // The polling instance and the migrating instance should both
      // return a similar migraiton result.
      assert.deepEqual(
        result.map(({ status, destIndex }) => ({ status, destIndex })),
        [
          { status: 'migrated', destIndex: '.migration-c_2' },
          { status: 'skipped', destIndex: undefined },
        ],
      );

      // It only created the original and the dest
      assert.deepEqual(
        _.pluck(await callCluster('cat.indices', { index: '.migration-c*', format: 'json' }), 'index').sort(),
        ['.migration-c_1', '.migration-c_2'],
      );

      // The docs in the original index are unchanged
      assert.deepEqual(await fetchDocs({ callCluster, index: `${index}_1` }), [
        { id: 'foo:lotr', type: 'foo', foo: { name: 'Lord of the Rings' } },
      ]);

      // The docs in the alias have been migrated
      assert.deepEqual(await fetchDocs({ callCluster, index }), [
        { id: 'foo:lotr', type: 'foo', migrationVersion: { foo: '1.0.0' }, foo: { name: 'LOTR' } },
      ]);
    });
  });
};

async function createIndex({ callCluster, index }) {
  await callCluster('indices.delete', { index: `${index}*`, ignore: [404] });
  const properties = {
    type: { type: 'keyword' },
    foo: { properties: { name: { type: 'keyword' } } },
    bar: { properties: { nomnom: { type: 'integer' } } },
    baz: { properties: { title: { type: 'keyword' } } },
  };
  await callCluster('indices.create', {
    index,
    body: { mappings: { doc: { dynamic: 'strict', properties } } },
  });
}

async function createDocs({ callCluster, index, docs }) {
  await callCluster('bulk', {
    body: docs.reduce((acc, doc) => {
      acc.push({ index: { _id: doc.id, _index: index, _type: 'doc' } });
      acc.push(_.omit(doc, 'id'));
      return acc;
    }, []),
  });
  await callCluster('indices.refresh', { index });
}

async function migrateIndex({ callCluster, index, migrations, mappingProperties, validateDoc }) {
  const documentMigrator = new DocumentMigrator({
    kibanaVersion: '99.9.9',
    migrations,
    validateDoc: validateDoc || _.noop,
  });

  const migrator = new IndexMigrator({
    batchSize: 10,
    callCluster,
    documentMigrator,
    index,
    log: _.noop,
    mappingProperties,
    pollInterval: 50,
    scrollDuration: '5m',
  });

  return await migrator.migrate();
}

async function fetchDocs({ callCluster, index }) {
  const {
    hits: { hits },
  } = await callCluster('search', { index, type: 'doc' });
  return hits.map(h => ({
    ...h._source,
    id: h._id,
  }));
}

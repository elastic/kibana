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

import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import expect from '@kbn/expect';
import { ElasticsearchClient, SavedObjectMigrationMap, SavedObjectsType } from 'src/core/server';
import { SearchResponse } from '../../../../src/core/server/elasticsearch/client';
import {
  DocumentMigrator,
  IndexMigrator,
  createMigrationEsClient,
} from '../../../../src/core/server/saved_objects/migrations/core';
import { SavedObjectsTypeMappingDefinitions } from '../../../../src/core/server/saved_objects/mappings';

import {
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
} from '../../../../src/core/server/saved_objects';
import { FtrProviderContext } from '../../ftr_provider_context';

function getLogMock() {
  return {
    debug() {},
    error() {},
    fatal() {},
    info() {},
    log() {},
    trace() {},
    warn() {},
    get: getLogMock,
  };
}
export default ({ getService }: FtrProviderContext) => {
  const esClient = getService('es');

  describe('Kibana index migration', () => {
    before(() => esClient.indices.delete({ index: '.migrate-*' }));

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

      const migrations: Record<string, SavedObjectMigrationMap> = {
        foo: {
          '1.0.0': (doc) => set(doc, 'attributes.name', doc.attributes.name.toUpperCase()),
        },
        bar: {
          '1.0.0': (doc) => set(doc, 'attributes.nomnom', doc.attributes.nomnom + 1),
          '1.3.0': (doc) => set(doc, 'attributes', { mynum: doc.attributes.nomnom }),
          '1.9.0': (doc) => set(doc, 'attributes.mynum', doc.attributes.mynum * 2),
        },
      };

      await createIndex({ esClient, index });
      await createDocs({ esClient, index, docs: originalDocs });

      // Test that unrelated index templates are unaffected
      await esClient.indices.putTemplate({
        name: 'migration_test_a_template',
        body: {
          index_patterns: 'migration_test_a',
          mappings: {
            dynamic: 'strict',
            properties: { baz: { type: 'text' } },
          },
        },
      });

      // Test that obsolete index templates get removed
      await esClient.indices.putTemplate({
        name: 'migration_a_template',
        body: {
          index_patterns: index,
          mappings: {
            dynamic: 'strict',
            properties: { baz: { type: 'text' } },
          },
        },
      });

      const migrationATemplate = await esClient.indices.existsTemplate({
        name: 'migration_a_template',
      });
      expect(migrationATemplate.body).to.be.ok();

      const result = await migrateIndex({
        esClient,
        index,
        migrations,
        mappingProperties,
        obsoleteIndexTemplatePattern: 'migration_a*',
      });

      const migrationATemplateAfter = await esClient.indices.existsTemplate({
        name: 'migration_a_template',
      });

      expect(migrationATemplateAfter.body).not.to.be.ok();
      const migrationTestATemplateAfter = await esClient.indices.existsTemplate({
        name: 'migration_test_a_template',
      });

      expect(migrationTestATemplateAfter.body).to.be.ok();
      expect(_.omit(result, 'elapsedMs')).to.eql({
        destIndex: '.migration-a_2',
        sourceIndex: '.migration-a_1',
        status: 'migrated',
      });

      // The docs in the original index are unchanged
      expect(await fetchDocs(esClient, `${index}_1`)).to.eql([
        { id: 'bar:i', type: 'bar', bar: { nomnom: 33 } },
        { id: 'bar:o', type: 'bar', bar: { nomnom: 2 } },
        { id: 'baz:u', type: 'baz', baz: { title: 'Terrific!' } },
        { id: 'foo:a', type: 'foo', foo: { name: 'Foo A' } },
        { id: 'foo:e', type: 'foo', foo: { name: 'Fooey' } },
      ]);

      // The docs in the alias have been migrated
      expect(await fetchDocs(esClient, index)).to.eql([
        {
          id: 'bar:i',
          type: 'bar',
          migrationVersion: { bar: '1.9.0' },
          bar: { mynum: 68 },
          references: [],
        },
        {
          id: 'bar:o',
          type: 'bar',
          migrationVersion: { bar: '1.9.0' },
          bar: { mynum: 6 },
          references: [],
        },
        { id: 'baz:u', type: 'baz', baz: { title: 'Terrific!' }, references: [] },
        {
          id: 'foo:a',
          type: 'foo',
          migrationVersion: { foo: '1.0.0' },
          foo: { name: 'FOO A' },
          references: [],
        },
        {
          id: 'foo:e',
          type: 'foo',
          migrationVersion: { foo: '1.0.0' },
          foo: { name: 'FOOEY' },
          references: [],
        },
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

      const migrations: Record<string, SavedObjectMigrationMap> = {
        foo: {
          '1.0.0': (doc) => set(doc, 'attributes.name', doc.attributes.name.toUpperCase()),
        },
        bar: {
          '1.0.0': (doc) => set(doc, 'attributes.nomnom', doc.attributes.nomnom + 1),
          '1.3.0': (doc) => set(doc, 'attributes', { mynum: doc.attributes.nomnom }),
          '1.9.0': (doc) => set(doc, 'attributes.mynum', doc.attributes.mynum * 2),
        },
      };

      await createIndex({ esClient, index });
      await createDocs({ esClient, index, docs: originalDocs });

      await migrateIndex({ esClient, index, migrations, mappingProperties });

      // @ts-expect-error name doesn't exist on mynum type
      mappingProperties.bar.properties.name = { type: 'keyword' };
      migrations.foo['2.0.1'] = (doc) => set(doc, 'attributes.name', `${doc.attributes.name}v2`);
      migrations.bar['2.3.4'] = (doc) => set(doc, 'attributes.name', `NAME ${doc.id}`);

      await migrateIndex({ esClient, index, migrations, mappingProperties });

      // The index for the initial migration has not been destroyed...
      expect(await fetchDocs(esClient, `${index}_2`)).to.eql([
        {
          id: 'bar:i',
          type: 'bar',
          migrationVersion: { bar: '1.9.0' },
          bar: { mynum: 68 },
          references: [],
        },
        {
          id: 'bar:o',
          type: 'bar',
          migrationVersion: { bar: '1.9.0' },
          bar: { mynum: 6 },
          references: [],
        },
        {
          id: 'foo:a',
          type: 'foo',
          migrationVersion: { foo: '1.0.0' },
          foo: { name: 'FOO A' },
          references: [],
        },
        {
          id: 'foo:e',
          type: 'foo',
          migrationVersion: { foo: '1.0.0' },
          foo: { name: 'FOOEY' },
          references: [],
        },
      ]);

      // The docs were migrated again...
      expect(await fetchDocs(esClient, index)).to.eql([
        {
          id: 'bar:i',
          type: 'bar',
          migrationVersion: { bar: '2.3.4' },
          bar: { mynum: 68, name: 'NAME i' },
          references: [],
        },
        {
          id: 'bar:o',
          type: 'bar',
          migrationVersion: { bar: '2.3.4' },
          bar: { mynum: 6, name: 'NAME o' },
          references: [],
        },
        {
          id: 'foo:a',
          type: 'foo',
          migrationVersion: { foo: '2.0.1' },
          foo: { name: 'FOO Av2' },
          references: [],
        },
        {
          id: 'foo:e',
          type: 'foo',
          migrationVersion: { foo: '2.0.1' },
          foo: { name: 'FOOEYv2' },
          references: [],
        },
      ]);
    });

    it('Coordinates migrations across the Kibana cluster', async () => {
      const index = '.migration-c';
      const originalDocs = [{ id: 'foo:lotr', type: 'foo', foo: { name: 'Lord of the Rings' } }];

      const mappingProperties = {
        foo: { properties: { name: { type: 'text' } } },
      };

      const migrations: Record<string, SavedObjectMigrationMap> = {
        foo: {
          '1.0.0': (doc) => set(doc, 'attributes.name', 'LOTR'),
        },
      };

      await createIndex({ esClient, index });
      await createDocs({ esClient, index, docs: originalDocs });

      const result = await Promise.all([
        migrateIndex({ esClient, index, migrations, mappingProperties }),
        migrateIndex({ esClient, index, migrations, mappingProperties }),
      ]);

      // The polling instance and the migrating instance should both
      // return a similar migration result.
      expect(
        result
          // @ts-expect-error destIndex exists only on MigrationResult status: 'migrated';
          .map(({ status, destIndex }) => ({ status, destIndex }))
          .sort((a) => (a.destIndex ? 0 : 1))
      ).to.eql([
        { status: 'migrated', destIndex: '.migration-c_2' },
        { status: 'skipped', destIndex: undefined },
      ]);

      const { body } = await esClient.cat.indices({ index: '.migration-c*', format: 'json' });
      // It only created the original and the dest
      expect(_.map(body, 'index').sort()).to.eql(['.migration-c_1', '.migration-c_2']);

      // The docs in the original index are unchanged
      expect(await fetchDocs(esClient, `${index}_1`)).to.eql([
        { id: 'foo:lotr', type: 'foo', foo: { name: 'Lord of the Rings' } },
      ]);

      // The docs in the alias have been migrated
      expect(await fetchDocs(esClient, index)).to.eql([
        {
          id: 'foo:lotr',
          type: 'foo',
          migrationVersion: { foo: '1.0.0' },
          foo: { name: 'LOTR' },
          references: [],
        },
      ]);
    });
  });
};

async function createIndex({ esClient, index }: { esClient: ElasticsearchClient; index: string }) {
  await esClient.indices.delete({ index: `${index}*` }, { ignore: [404] });
  const properties = {
    type: { type: 'keyword' },
    foo: { properties: { name: { type: 'keyword' } } },
    bar: { properties: { nomnom: { type: 'integer' } } },
    baz: { properties: { title: { type: 'keyword' } } },
  };
  await esClient.indices.create({
    index,
    body: { mappings: { dynamic: 'strict', properties } },
  });
}

async function createDocs({
  esClient,
  index,
  docs,
}: {
  esClient: ElasticsearchClient;
  index: string;
  docs: any[];
}) {
  await esClient.bulk({
    body: docs.reduce((acc, doc) => {
      acc.push({ index: { _id: doc.id, _index: index } });
      acc.push(_.omit(doc, 'id'));
      return acc;
    }, []),
  });
  await esClient.indices.refresh({ index });
}

async function migrateIndex({
  esClient,
  index,
  migrations,
  mappingProperties,
  obsoleteIndexTemplatePattern,
}: {
  esClient: ElasticsearchClient;
  index: string;
  migrations: Record<string, SavedObjectMigrationMap>;
  mappingProperties: SavedObjectsTypeMappingDefinitions;
  obsoleteIndexTemplatePattern?: string;
}) {
  const typeRegistry = new SavedObjectTypeRegistry();
  const types = migrationsToTypes(migrations);
  types.forEach((type) => typeRegistry.registerType(type));

  const documentMigrator = new DocumentMigrator({
    kibanaVersion: '99.9.9',
    typeRegistry,
    log: getLogMock(),
  });

  const migrator = new IndexMigrator({
    client: createMigrationEsClient(esClient, getLogMock()),
    documentMigrator,
    index,
    obsoleteIndexTemplatePattern,
    mappingProperties,
    batchSize: 10,
    log: getLogMock(),
    pollInterval: 50,
    scrollDuration: '5m',
    serializer: new SavedObjectsSerializer(typeRegistry),
  });

  return await migrator.migrate();
}

function migrationsToTypes(
  migrations: Record<string, SavedObjectMigrationMap>
): SavedObjectsType[] {
  return Object.entries(migrations).map(([type, migrationsMap]) => ({
    name: type,
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    migrations: { ...migrationsMap },
  }));
}

async function fetchDocs(esClient: ElasticsearchClient, index: string) {
  const { body } = await esClient.search<SearchResponse<any>>({ index });

  return body.hits.hits
    .map((h) => ({
      ...h._source,
      id: h._id,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

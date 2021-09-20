/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Smokescreen tests for core migration logic
 */

import uuidv5 from 'uuid/v5';
import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import expect from '@kbn/expect';
import { ElasticsearchClient, SavedObjectsType } from 'src/core/server';

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

const KIBANA_VERSION = '99.9.9';
const FOO_TYPE: SavedObjectsType = {
  name: 'foo',
  hidden: false,
  namespaceType: 'single',
  mappings: { properties: {} },
};
const BAR_TYPE: SavedObjectsType = {
  name: 'bar',
  hidden: false,
  namespaceType: 'single',
  mappings: { properties: {} },
};
const BAZ_TYPE: SavedObjectsType = {
  name: 'baz',
  hidden: false,
  namespaceType: 'single',
  mappings: { properties: {} },
};
const FLEET_AGENT_EVENT_TYPE: SavedObjectsType = {
  name: 'fleet-agent-event',
  hidden: false,
  namespaceType: 'single',
  mappings: { properties: {} },
};

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
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('Kibana index migration', () => {
    before(() => esDeleteAllIndices('.migrate-*'));

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
      } as const;

      const savedObjectTypes: SavedObjectsType[] = [
        {
          ...FOO_TYPE,
          migrations: {
            '1.0.0': (doc) => set(doc, 'attributes.name', doc.attributes.name.toUpperCase()),
          },
        },
        {
          ...BAR_TYPE,
          migrations: {
            '1.0.0': (doc) => set(doc, 'attributes.nomnom', doc.attributes.nomnom + 1),
            '1.3.0': (doc) => set(doc, 'attributes', { mynum: doc.attributes.nomnom }),
            '1.9.0': (doc) => set(doc, 'attributes.mynum', doc.attributes.mynum * 2),
          },
        },
      ];

      await createIndex({ esClient, index, esDeleteAllIndices });
      await createDocs({ esClient, index, docs: originalDocs });

      // Test that unrelated index templates are unaffected
      await esClient.indices.putTemplate({
        name: 'migration_test_a_template',
        body: {
          index_patterns: ['migration_test_a'],
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
          index_patterns: [index],
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
        savedObjectTypes,
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
      expect(await fetchDocs(esClient, `${index}_1`)).to.eql(originalDocs.sort(sortByTypeAndId));

      // The docs in the alias have been migrated
      expect(await fetchDocs(esClient, index)).to.eql([
        {
          id: 'bar:i',
          type: 'bar',
          migrationVersion: { bar: '1.9.0' },
          bar: { mynum: 68 },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'bar:o',
          type: 'bar',
          migrationVersion: { bar: '1.9.0' },
          bar: { mynum: 6 },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'baz:u',
          type: 'baz',
          baz: { title: 'Terrific!' },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'foo:a',
          type: 'foo',
          migrationVersion: { foo: '1.0.0' },
          foo: { name: 'FOO A' },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'foo:e',
          type: 'foo',
          migrationVersion: { foo: '1.0.0' },
          foo: { name: 'FOOEY' },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
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
      } as const;

      let savedObjectTypes: SavedObjectsType[] = [
        {
          ...FOO_TYPE,
          migrations: {
            '1.0.0': (doc) => set(doc, 'attributes.name', doc.attributes.name.toUpperCase()),
          },
        },
        {
          ...BAR_TYPE,
          migrations: {
            '1.0.0': (doc) => set(doc, 'attributes.nomnom', doc.attributes.nomnom + 1),
            '1.3.0': (doc) => set(doc, 'attributes', { mynum: doc.attributes.nomnom }),
            '1.9.0': (doc) => set(doc, 'attributes.mynum', doc.attributes.mynum * 2),
          },
        },
      ];

      await createIndex({ esClient, index, esDeleteAllIndices });
      await createDocs({ esClient, index, docs: originalDocs });

      await migrateIndex({ esClient, index, savedObjectTypes, mappingProperties });

      // @ts-expect-error name doesn't exist on mynum type
      mappingProperties.bar.properties.name = { type: 'keyword' };
      savedObjectTypes = [
        {
          ...FOO_TYPE,
          migrations: {
            '2.0.1': (doc) => set(doc, 'attributes.name', `${doc.attributes.name}v2`),
          },
        },
        {
          ...BAR_TYPE,
          migrations: {
            '2.3.4': (doc) => set(doc, 'attributes.name', `NAME ${doc.id}`),
          },
        },
      ];

      await migrateIndex({ esClient, index, savedObjectTypes, mappingProperties });

      // The index for the initial migration has not been destroyed...
      expect(await fetchDocs(esClient, `${index}_2`)).to.eql([
        {
          id: 'bar:i',
          type: 'bar',
          migrationVersion: { bar: '1.9.0' },
          bar: { mynum: 68 },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'bar:o',
          type: 'bar',
          migrationVersion: { bar: '1.9.0' },
          bar: { mynum: 6 },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'foo:a',
          type: 'foo',
          migrationVersion: { foo: '1.0.0' },
          foo: { name: 'FOO A' },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'foo:e',
          type: 'foo',
          migrationVersion: { foo: '1.0.0' },
          foo: { name: 'FOOEY' },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
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
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'bar:o',
          type: 'bar',
          migrationVersion: { bar: '2.3.4' },
          bar: { mynum: 6, name: 'NAME o' },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'foo:a',
          type: 'foo',
          migrationVersion: { foo: '2.0.1' },
          foo: { name: 'FOO Av2' },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'foo:e',
          type: 'foo',
          migrationVersion: { foo: '2.0.1' },
          foo: { name: 'FOOEYv2' },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
      ]);
    });

    it('drops fleet-agent-event saved object types when doing a migration', async () => {
      const index = '.migration-b';
      const originalDocs = [
        {
          id: 'fleet-agent-event:a',
          type: 'fleet-agent-event',
          'fleet-agent-event': { name: 'Foo A' },
        },
        {
          id: 'fleet-agent-event:e',
          type: 'fleet-agent-event',
          'fleet-agent-event': { name: 'Fooey' },
        },
        { id: 'bar:i', type: 'bar', bar: { nomnom: 33 } },
        { id: 'bar:o', type: 'bar', bar: { nomnom: 2 } },
      ];

      const mappingProperties = {
        'fleet-agent-event': { properties: { name: { type: 'text' } } },
        bar: { properties: { mynum: { type: 'integer' } } },
      } as const;

      let savedObjectTypes: SavedObjectsType[] = [
        FLEET_AGENT_EVENT_TYPE,
        {
          ...BAR_TYPE,
          migrations: {
            '1.0.0': (doc) => set(doc, 'attributes.nomnom', doc.attributes.nomnom + 1),
            '1.3.0': (doc) => set(doc, 'attributes', { mynum: doc.attributes.nomnom }),
            '1.9.0': (doc) => set(doc, 'attributes.mynum', doc.attributes.mynum * 2),
          },
        },
      ];

      await createIndex({ esClient, index, esDeleteAllIndices });
      await createDocs({ esClient, index, docs: originalDocs });

      await migrateIndex({ esClient, index, savedObjectTypes, mappingProperties });

      // @ts-expect-error name doesn't exist on mynum type
      mappingProperties.bar.properties.name = { type: 'keyword' };
      savedObjectTypes = [
        FLEET_AGENT_EVENT_TYPE,
        {
          ...BAR_TYPE,
          migrations: {
            '2.3.4': (doc) => set(doc, 'attributes.name', `NAME ${doc.id}`),
          },
        },
      ];

      await migrateIndex({ esClient, index, savedObjectTypes, mappingProperties });

      // Assert that fleet-agent-events were dropped
      expect(await fetchDocs(esClient, index)).to.eql([
        {
          id: 'bar:i',
          type: 'bar',
          migrationVersion: { bar: '2.3.4' },
          bar: { mynum: 68, name: 'NAME i' },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
        {
          id: 'bar:o',
          type: 'bar',
          migrationVersion: { bar: '2.3.4' },
          bar: { mynum: 6, name: 'NAME o' },
          references: [],
          coreMigrationVersion: KIBANA_VERSION,
        },
      ]);
    });

    it('Coordinates migrations across the Kibana cluster', async () => {
      const index = '.migration-c';
      const originalDocs = [{ id: 'foo:lotr', type: 'foo', foo: { name: 'Lord of the Rings' } }];

      const mappingProperties = {
        foo: { properties: { name: { type: 'text' } } },
      } as const;

      const savedObjectTypes: SavedObjectsType[] = [
        {
          ...FOO_TYPE,
          migrations: {
            '1.0.0': (doc) => set(doc, 'attributes.name', 'LOTR'),
          },
        },
      ];

      await createIndex({ esClient, index, esDeleteAllIndices });
      await createDocs({ esClient, index, docs: originalDocs });

      const result = await Promise.all([
        migrateIndex({ esClient, index, savedObjectTypes, mappingProperties }),
        migrateIndex({ esClient, index, savedObjectTypes, mappingProperties }),
      ]);

      // The polling instance and the migrating instance should both
      // return a similar migration result.
      expect(
        result
          // @ts-expect-error destIndex exists only on MigrationResult status: 'migrated';
          .map(({ status, destIndex }) => ({ status, destIndex }))
          .sort(({ destIndex: a }, { destIndex: b }) =>
            // sort by destIndex in ascending order, keeping falsy values at the end
            (a && !b) || a < b ? -1 : (!a && b) || a > b ? 1 : 0
          )
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
          coreMigrationVersion: KIBANA_VERSION,
        },
      ]);
    });

    it('Correctly applies reference transforms and conversion transforms', async () => {
      const index = '.migration-d';
      const originalDocs = [
        { id: 'foo:1', type: 'foo', foo: { name: 'Foo 1 default' } },
        { id: 'spacex:foo:1', type: 'foo', foo: { name: 'Foo 1 spacex' }, namespace: 'spacex' },
        {
          id: 'bar:1',
          type: 'bar',
          bar: { nomnom: 1 },
          references: [{ type: 'foo', id: '1', name: 'Foo 1 default' }],
        },
        {
          id: 'spacex:bar:1',
          type: 'bar',
          bar: { nomnom: 2 },
          references: [{ type: 'foo', id: '1', name: 'Foo 1 spacex' }],
          namespace: 'spacex',
        },
        {
          id: 'baz:1',
          type: 'baz',
          baz: { title: 'Baz 1 default' },
          references: [{ type: 'bar', id: '1', name: 'Bar 1 default' }],
        },
        {
          id: 'spacex:baz:1',
          type: 'baz',
          baz: { title: 'Baz 1 spacex' },
          references: [{ type: 'bar', id: '1', name: 'Bar 1 spacex' }],
          namespace: 'spacex',
        },
      ];

      const mappingProperties = {
        foo: { properties: { name: { type: 'text' } } },
        bar: { properties: { nomnom: { type: 'integer' } } },
        baz: { properties: { title: { type: 'keyword' } } },
      } as const;

      const savedObjectTypes: SavedObjectsType[] = [
        {
          ...FOO_TYPE,
          namespaceType: 'multiple',
          convertToMultiNamespaceTypeVersion: '1.0.0',
        },
        {
          ...BAR_TYPE,
          namespaceType: 'multiple-isolated',
          convertToMultiNamespaceTypeVersion: '2.0.0',
        },
        BAZ_TYPE, // must be registered for reference transforms to be applied to objects of this type
      ];

      await createIndex({ esClient, index, esDeleteAllIndices });
      await createDocs({ esClient, index, docs: originalDocs });

      await migrateIndex({
        esClient,
        index,
        savedObjectTypes,
        mappingProperties,
        obsoleteIndexTemplatePattern: 'migration_a*',
      });

      // The docs in the original index are unchanged
      expect(await fetchDocs(esClient, `${index}_1`)).to.eql(originalDocs.sort(sortByTypeAndId));

      // The docs in the alias have been migrated
      const migratedDocs = await fetchDocs(esClient, index);

      // each newly converted multi-namespace object in a non-default space has its ID deterministically regenerated, and a legacy-url-alias
      // object is created which links the old ID to the new ID
      const newFooId = uuidv5('spacex:foo:1', uuidv5.DNS);
      const newBarId = uuidv5('spacex:bar:1', uuidv5.DNS);

      expect(migratedDocs).to.eql(
        [
          {
            id: 'foo:1',
            type: 'foo',
            foo: { name: 'Foo 1 default' },
            references: [],
            namespaces: ['default'],
            migrationVersion: { foo: '1.0.0' },
            coreMigrationVersion: KIBANA_VERSION,
          },
          {
            id: `foo:${newFooId}`,
            type: 'foo',
            foo: { name: 'Foo 1 spacex' },
            references: [],
            namespaces: ['spacex'],
            originId: '1',
            migrationVersion: { foo: '1.0.0' },
            coreMigrationVersion: KIBANA_VERSION,
          },
          {
            // new object
            id: 'legacy-url-alias:spacex:foo:1',
            type: 'legacy-url-alias',
            'legacy-url-alias': {
              sourceId: '1',
              targetId: newFooId,
              targetNamespace: 'spacex',
              targetType: 'foo',
            },
            migrationVersion: {},
            references: [],
            coreMigrationVersion: KIBANA_VERSION,
          },
          {
            id: 'bar:1',
            type: 'bar',
            bar: { nomnom: 1 },
            references: [{ type: 'foo', id: '1', name: 'Foo 1 default' }],
            namespaces: ['default'],
            migrationVersion: { bar: '2.0.0' },
            coreMigrationVersion: KIBANA_VERSION,
          },
          {
            id: `bar:${newBarId}`,
            type: 'bar',
            bar: { nomnom: 2 },
            references: [{ type: 'foo', id: newFooId, name: 'Foo 1 spacex' }],
            namespaces: ['spacex'],
            originId: '1',
            migrationVersion: { bar: '2.0.0' },
            coreMigrationVersion: KIBANA_VERSION,
          },
          {
            // new object
            id: 'legacy-url-alias:spacex:bar:1',
            type: 'legacy-url-alias',
            'legacy-url-alias': {
              sourceId: '1',
              targetId: newBarId,
              targetNamespace: 'spacex',
              targetType: 'bar',
            },
            migrationVersion: {},
            references: [],
            coreMigrationVersion: KIBANA_VERSION,
          },
          {
            id: 'baz:1',
            type: 'baz',
            baz: { title: 'Baz 1 default' },
            references: [{ type: 'bar', id: '1', name: 'Bar 1 default' }],
            coreMigrationVersion: KIBANA_VERSION,
          },
          {
            id: 'spacex:baz:1',
            type: 'baz',
            baz: { title: 'Baz 1 spacex' },
            references: [{ type: 'bar', id: newBarId, name: 'Bar 1 spacex' }],
            namespace: 'spacex',
            coreMigrationVersion: KIBANA_VERSION,
          },
        ].sort(sortByTypeAndId)
      );
    });
  });
};

async function createIndex({
  esClient,
  index,
  esDeleteAllIndices,
}: {
  esClient: ElasticsearchClient;
  index: string;
  esDeleteAllIndices: (pattern: string) => Promise<void>;
}) {
  await esDeleteAllIndices(`${index}*`);

  const properties = {
    type: { type: 'keyword' },
    foo: { properties: { name: { type: 'keyword' } } },
    bar: { properties: { nomnom: { type: 'integer' } } },
    baz: { properties: { title: { type: 'keyword' } } },
    'legacy-url-alias': {
      properties: {
        targetNamespace: { type: 'text' },
        targetType: { type: 'text' },
        targetId: { type: 'text' },
        lastResolved: { type: 'date' },
        resolveCounter: { type: 'integer' },
        disabled: { type: 'boolean' },
      },
    },
    namespace: { type: 'keyword' },
    namespaces: { type: 'keyword' },
    originId: { type: 'keyword' },
    references: {
      type: 'nested',
      properties: {
        name: { type: 'keyword' },
        type: { type: 'keyword' },
        id: { type: 'keyword' },
      },
    },
    coreMigrationVersion: {
      type: 'keyword',
    },
  } as const;
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
  savedObjectTypes,
  mappingProperties,
  obsoleteIndexTemplatePattern,
}: {
  esClient: ElasticsearchClient;
  index: string;
  savedObjectTypes: SavedObjectsType[];
  mappingProperties: SavedObjectsTypeMappingDefinitions;
  obsoleteIndexTemplatePattern?: string;
}) {
  const typeRegistry = new SavedObjectTypeRegistry();
  savedObjectTypes.forEach((type) => typeRegistry.registerType(type));

  const documentMigrator = new DocumentMigrator({
    kibanaVersion: KIBANA_VERSION,
    typeRegistry,
    minimumConvertVersion: '0.0.0', // bypass the restriction of a minimum version of 8.0.0 for these integration tests
    log: getLogMock(),
  });

  documentMigrator.prepareMigrations();

  const migrator = new IndexMigrator({
    client: createMigrationEsClient(esClient, getLogMock()),
    documentMigrator,
    index,
    kibanaVersion: KIBANA_VERSION,
    obsoleteIndexTemplatePattern,
    mappingProperties,
    batchSize: 10,
    log: getLogMock(),
    setStatus: () => {},
    pollInterval: 50,
    scrollDuration: '5m',
    serializer: new SavedObjectsSerializer(typeRegistry),
  });

  return await migrator.migrate();
}

async function fetchDocs(esClient: ElasticsearchClient, index: string) {
  const { body } = await esClient.search<any>({ index });

  return body.hits.hits
    .map((h) => ({
      ...h._source,
      id: h._id,
    }))
    .sort(sortByTypeAndId);
}

function sortByTypeAndId(a: { type: string; id: string }, b: { type: string; id: string }) {
  return a.type.localeCompare(b.type) || a.id.localeCompare(b.id);
}

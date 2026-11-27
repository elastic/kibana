/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingDynamicTemplate } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import { apiTest, tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ALL_ENTITY_TYPES } from '../../../../../common/domain/definitions/entity_schema';
import {
  ENTITY_LATEST,
  LATEST_INDEX_MAPPINGS_VERSION,
  LATEST_INDEX_MAPPINGS_VERSION_META_KEY,
  getEntitiesAlias,
  getLatestEntitiesIndexName,
} from '../../../../../common/domain/entity_index';
import { getComponentTemplateName } from '../../../../../server/domain/asset_manager/component_templates';
import { getHistorySnapshotIndexTemplateId } from '../../../../../server/domain/asset_manager/history_snapshot_index_template';
import { getLatestIndexTemplateId } from '../../../../../server/domain/asset_manager/latest_index_template';
import { getLatestIndexMappingProperties } from '../../../../../server/domain/asset_manager/latest_index_mappings';
import { getMetadataComponentTemplateName } from '../../../../../server/domain/asset_manager/metadata_component_templates';
import { getMetadataIndexTemplateId } from '../../../../../server/domain/asset_manager/metadata_index_template';
import { migrateLatestIndexMappings } from '../../../../../server/domain/asset_manager/migrate_latest_index_mappings';

// A throwaway namespace: nothing of the default namespace, its indices or its templates is touched.
const NAMESPACE = 'migrationtest';
const LATEST_INDEX = getLatestEntitiesIndexName(NAMESPACE);
const USER_ENTITY_ID = 'user.entity.id';
const USER_ENTITY_ID_DEFINITION = getLatestIndexMappingProperties(NAMESPACE)[USER_ENTITY_ID];

type MappingProperties = Record<string, object>;

const createRecordingLogger = () => {
  const warnings: string[] = [];
  const noop = () => {};
  const logger: Logger = {
    trace: noop,
    debug: noop,
    info: noop,
    error: noop,
    fatal: noop,
    warn: (message) => {
      warnings.push(String(typeof message === 'function' ? message() : message));
    },
    log: noop,
    isLevelEnabled: () => false,
    get: () => logger,
  };
  return { logger, warnings };
};

const withoutFields = (properties: MappingProperties, fields: string[]): MappingProperties =>
  Object.fromEntries(Object.entries(properties).filter(([field]) => !fields.includes(field)));

// What the latest index template maps every other string field to.
const STRINGS_AS_KEYWORD: Record<string, MappingDynamicTemplate> = {
  strings_as_keyword: {
    match_mapping_type: 'string',
    mapping: { type: 'keyword', ignore_above: 1024, fields: { text: { type: 'text' } } },
  },
};

interface CreateLatestIndexOptions {
  /** Lets Elasticsearch map fields that are not in `properties` the way the install does. */
  withDynamicTemplates?: boolean;
  /** Defaults to two documents that only carry `entity.id`, which every definition maps. */
  documents?: object[];
}

/** Creates a lookup-mode latest index the way an install from before this change created it. */
const createLatestIndex = async (
  esClient: EsClient,
  properties: MappingProperties,
  { withDynamicTemplates = false, documents }: CreateLatestIndexOptions = {}
) => {
  await esClient.indices.create({
    index: LATEST_INDEX,
    aliases: { [getEntitiesAlias(ENTITY_LATEST, NAMESPACE)]: {} },
    settings: { index: { mode: 'lookup' } },
    mappings: {
      _meta: { mappingsVersion: 1 },
      date_detection: false,
      ...(withDynamicTemplates ? { dynamic_templates: [STRINGS_AS_KEYWORD] } : {}),
      properties,
    },
  });
  const seeded = documents ?? [{ entity: { id: 'user-1' } }, { entity: { id: 'user-2' } }];
  await esClient.bulk({
    index: LATEST_INDEX,
    operations: seeded.flatMap((document) => [{ index: {} }, document]),
    refresh: true,
  });
};

const readLatestIndex = async (esClient: EsClient) => {
  const [mappingResponse, settingsResponse, count] = await Promise.all([
    esClient.indices.getMapping({ index: LATEST_INDEX }),
    esClient.indices.getSettings({ index: LATEST_INDEX }),
    esClient.count({ index: LATEST_INDEX }),
  ]);
  const { mappings } = mappingResponse[LATEST_INDEX];
  const { settings } = settingsResponse[LATEST_INDEX];
  return {
    mappings,
    mode: settings?.index?.mode,
    uuid: settings?.index?.uuid,
    docCount: count.count,
  };
};

const getUserEntityIdMapping = (mappings: { properties?: object }) =>
  (
    mappings.properties as {
      user?: { properties?: { entity?: { properties?: { id?: object } } } };
    }
  ).user?.properties?.entity?.properties?.id;

/**
 * Deletes everything the migration creates for the throwaway namespace. Safe to repeat. Each name
 * is deleted by its own request: a request naming several resources deletes none of them when one
 * is missing.
 */
const deleteMigrationTestAssets = async (esClient: EsClient) => {
  await esClient.indices.delete({ index: LATEST_INDEX }, { ignore: [404] });
  // Index templates first: a component template that is still in use cannot be deleted.
  await Promise.all(
    [
      getLatestIndexTemplateId(NAMESPACE),
      getHistorySnapshotIndexTemplateId(NAMESPACE),
      getMetadataIndexTemplateId(NAMESPACE),
    ].map((name) => esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] }))
  );
  await Promise.all(
    [
      ...ALL_ENTITY_TYPES.map((type) => getComponentTemplateName(type, NAMESPACE)),
      getMetadataComponentTemplateName(NAMESPACE),
    ].map((name) => esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] }))
  );
};

apiTest.describe(
  'latest index mappings upgrade of an existing install',
  // Stateful only: it creates dot-prefixed lookup indices and templates directly with the test
  // client, which is not verified on serverless.
  { tag: tags.stateful.classic },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      // Leftovers of an interrupted run would make the index created below match a template.
      await deleteMigrationTestAssets(esClient);
    });

    apiTest.afterEach(async ({ esClient }) => {
      await deleteMigrationTestAssets(esClient);
    });

    apiTest(
      'adds user.entity.id and the version to an index that predates it, without touching the index itself',
      async ({ esClient }) => {
        const { logger, warnings } = createRecordingLogger();
        await createLatestIndex(
          esClient,
          withoutFields(getLatestIndexMappingProperties(NAMESPACE), [USER_ENTITY_ID])
        );
        const before = await readLatestIndex(esClient);
        expect(getUserEntityIdMapping(before.mappings)).toBeUndefined();

        const result = await migrateLatestIndexMappings({
          esClient,
          logger,
          namespace: NAMESPACE,
        });

        expect(result).toBe('migrated');
        const after = await readLatestIndex(esClient);
        expect(getUserEntityIdMapping(after.mappings)).toMatchObject(USER_ENTITY_ID_DEFINITION);
        expect(after.mappings._meta).toStrictEqual({
          mappingsVersion: 1,
          [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
        });
        expect(after.mode).toBe('lookup');
        expect(after.uuid).toBe(before.uuid);
        expect(after.docCount).toBe(2);
        expect(warnings).toStrictEqual([]);
      }
    );

    apiTest('is a no-op when run a second time', async ({ esClient }) => {
      const { logger } = createRecordingLogger();
      await createLatestIndex(
        esClient,
        withoutFields(getLatestIndexMappingProperties(NAMESPACE), [USER_ENTITY_ID])
      );
      expect(await migrateLatestIndexMappings({ esClient, logger, namespace: NAMESPACE })).toBe(
        'migrated'
      );
      const afterFirstRun = await readLatestIndex(esClient);

      const result = await migrateLatestIndexMappings({ esClient, logger, namespace: NAMESPACE });

      expect(result).toBe('up_to_date');
      const afterSecondRun = await readLatestIndex(esClient);
      expect(JSON.stringify(afterSecondRun.mappings)).toBe(JSON.stringify(afterFirstRun.mappings));
      expect(afterSecondRun.uuid).toBe(afterFirstRun.uuid);
    });

    apiTest(
      'counts a user.entity.id that Elasticsearch mapped dynamically as present and leaves it alone',
      async ({ esClient }) => {
        const { logger, warnings } = createRecordingLogger();
        // No explicit user.entity.id mapping: the seeded document makes the dynamic template map it.
        await createLatestIndex(
          esClient,
          withoutFields(getLatestIndexMappingProperties(NAMESPACE), [USER_ENTITY_ID, 'user.name']),
          {
            withDynamicTemplates: true,
            documents: [
              { entity: { id: 'user-1' }, user: { entity: { id: 'arn:aws:iam::1:user/a' } } },
            ],
          }
        );
        const before = await readLatestIndex(esClient);
        expect(getUserEntityIdMapping(before.mappings)).toMatchObject({
          type: 'keyword',
          ignore_above: 1024,
          fields: { text: { type: 'text' } },
        });

        const result = await migrateLatestIndexMappings({
          esClient,
          logger,
          namespace: NAMESPACE,
        });

        expect(result).toBe('migrated');
        const after = await readLatestIndex(esClient);
        expect(getUserEntityIdMapping(after.mappings)).toStrictEqual(
          getUserEntityIdMapping(before.mappings)
        );
        // The other missing field is still added
        expect(after.mappings.properties).toMatchObject({
          user: { properties: { name: getLatestIndexMappingProperties(NAMESPACE)['user.name'] } },
        });
        expect(after.mappings._meta).toStrictEqual({
          mappingsVersion: 1,
          [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
        });
        expect(warnings).toStrictEqual([]);
      }
    );

    apiTest(
      'keeps the live type of a conflicting field, adds the rest, writes the version and warns once',
      async ({ esClient }) => {
        const { logger, warnings } = createRecordingLogger();
        await createLatestIndex(esClient, {
          ...withoutFields(getLatestIndexMappingProperties(NAMESPACE), [
            USER_ENTITY_ID,
            'cloud.region',
          ]),
          'cloud.region': { type: 'long' },
        });

        const result = await migrateLatestIndexMappings({
          esClient,
          logger,
          namespace: NAMESPACE,
        });

        expect(result).toBe('migrated');
        const after = await readLatestIndex(esClient);
        expect(after.mappings.properties).toMatchObject({
          cloud: { properties: { region: { type: 'long' } } },
        });
        expect(getUserEntityIdMapping(after.mappings)).toMatchObject(USER_ENTITY_ID_DEFINITION);
        expect(after.mappings._meta).toStrictEqual({
          mappingsVersion: 1,
          [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
        });
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('cloud.region');
      }
    );
  }
);

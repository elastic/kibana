/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectModelDataBackfillFn,
  SavedObjectModelTransformationDoc,
  SavedObjectModelUnsafeTransformFn,
} from '@kbn/core-saved-objects-server';
import { SavedObject, SavedObjectsType } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import {
  generateHistoryIndexTemplateId,
  generateHistoryIngestPipelineId,
  generateHistoryTransformId,
  generateLatestIndexTemplateId,
  generateLatestIngestPipelineId,
  generateLatestTransformId,
} from '../lib/entities/helpers/generate_component_id';

export const SO_ENTITY_DEFINITION_TYPE = 'entity-definition';

export const backfillInstalledComponents: SavedObjectModelDataBackfillFn<
  EntityDefinition,
  EntityDefinition
> = (savedObject) => {
  const definition = savedObject.attributes;
  definition.installedComponents = [
    { type: 'transform', id: generateHistoryTransformId(definition) },
    { type: 'transform', id: generateLatestTransformId(definition) },
    { type: 'ingest_pipeline', id: generateHistoryIngestPipelineId(definition) },
    { type: 'ingest_pipeline', id: generateLatestIngestPipelineId(definition) },
    { type: 'template', id: generateHistoryIndexTemplateId(definition) },
    { type: 'template', id: generateLatestIndexTemplateId(definition) },
  ];
  return savedObject;
};

const removeOptionalIdentityFields: SavedObjectModelUnsafeTransformFn<
  EntityDefinition,
  EntityDefinition
> = (savedObject) => {
  // Doing only this may break displayNameTemplates
  savedObject.attributes.identityFields = savedObject.attributes.identityFields.filter(
    (identityField) => identityField.optional === false
  );

  return {
    document: savedObject as SavedObjectModelTransformationDoc<EntityDefinition>,
  };
};

export const entityDefinition: SavedObjectsType = {
  name: SO_ENTITY_DEFINITION_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      version: { type: 'keyword' },
      name: { type: 'text' },
      description: { type: 'text' },
      type: { type: 'keyword' },
      filter: { type: 'keyword' },
      indexPatterns: { type: 'keyword' },
      identityFields: { type: 'object' },
      metadata: { type: 'object' },
      metrics: { type: 'object' },
      staticFields: { type: 'object' },
      managed: { type: 'boolean' },
    },
  },
  management: {
    displayName: 'Entity Definition',
    importableAndExportable: false,
    getTitle(savedObject: SavedObject<EntityDefinition>) {
      return `EntityDefinition: [${savedObject.attributes.name}]`;
    },
  },
  modelVersions: {
    '1': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            version: { type: 'keyword' },
          },
        },
      ],
    },
    '2': {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: () => {
            return {
              attributes: {
                installStatus: 'installed',
                installStartedAt: new Date().toISOString(),
              },
            };
          },
        },
      ],
    },
    '3': {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: backfillInstalledComponents,
        },
      ],
    },
    '4': {
      changes: [
        {
          type: 'unsafe_transform',
          transformFn: removeOptionalIdentityFields,
        },
      ],
    },
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, ENTITY_SCHEMA_VERSION_V1, MetadataField } from '@kbn/entities-schema';
import {
  initializePathScript,
  cleanScript,
} from '../helpers/ingest_pipeline_script_processor_helpers';
import { generateLatestIndexName } from '../helpers/generate_component_id';
import { isBuiltinDefinition } from '../helpers/is_builtin_definition';

function getMetadataSourceField({ aggregation, destination, source }: MetadataField) {
  if (aggregation.type === 'terms') {
    return `ctx.entity.metadata.${destination}.data.keySet()`;
  } else if (aggregation.type === 'top_value') {
    return `ctx.entity.metadata.${destination}.top_value["${source}"]`;
  }
}

function mapDestinationToPainless(metadata: MetadataField) {
  const field = metadata.destination;
  return `
    ${initializePathScript(field)}
    ctx.${field} = ${getMetadataSourceField(metadata)};
  `;
}

function createMetadataPainlessScript(definition: EntityDefinition) {
  if (!definition.metadata) {
    return '';
  }

  return definition.metadata.reduce((acc, metadata) => {
    const { destination, source } = metadata;
    const optionalFieldPath = destination.replaceAll('.', '?.');

    if (metadata.aggregation.type === 'terms') {
      const next = `
        if (ctx.entity?.metadata?.${optionalFieldPath}?.data != null) {
          ${mapDestinationToPainless(metadata)}
        }
      `;
      return `${acc}\n${next}`;
    } else if (metadata.aggregation.type === 'top_value') {
      const next = `
        if (ctx.entity?.metadata?.${optionalFieldPath}?.top_value["${source}"] != null) {
          ${mapDestinationToPainless(metadata)}
        }
      `;
      return `${acc}\n${next}`;
    }

    return acc;
  }, '');
}

function liftIdentityFieldsToDocumentRoot(definition: EntityDefinition) {
  return definition.identityFields.map((key) => ({
    set: {
      if: `ctx.entity?.identity?.${key.field.replaceAll('.', '?.')} != null`,
      field: key.field,
      value: `{{entity.identity.${key.field}}}`,
    },
  }));
}

function getCustomIngestPipelines(definition: EntityDefinition) {
  if (isBuiltinDefinition(definition)) {
    return [];
  }

  return [
    {
      pipeline: {
        ignore_missing_pipeline: true,
        name: `${definition.id}@platform`,
      },
    },
    {
      pipeline: {
        ignore_missing_pipeline: true,
        name: `${definition.id}-latest@platform`,
      },
    },
    {
      pipeline: {
        ignore_missing_pipeline: true,
        name: `${definition.id}@custom`,
      },
    },
    {
      pipeline: {
        ignore_missing_pipeline: true,
        name: `${definition.id}-latest@custom`,
      },
    },
  ];
}

export function generateLatestProcessors(definition: EntityDefinition) {
  return [
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
    {
      set: {
        field: 'entity.type',
        value: definition.type,
      },
    },
    {
      set: {
        field: 'entity.definition_id',
        value: definition.id,
      },
    },
    {
      set: {
        field: 'entity.definition_version',
        value: definition.version,
      },
    },
    {
      set: {
        field: 'entity.schema_version',
        value: ENTITY_SCHEMA_VERSION_V1,
      },
    },
    {
      set: {
        field: 'entity.identity_fields',
        value: definition.identityFields.map((identityField) => identityField.field),
      },
    },
    {
      set: {
        field: 'entity.id',
        value: definition.identityFields
          .map((identityField) => identityField.field)
          .sort()
          .map((identityField) => `{{{entity.identity.${identityField}}}}`)
          .join('-'),
      },
    },
    ...(definition.staticFields != null
      ? Object.keys(definition.staticFields).map((field) => ({
          set: { field, value: definition.staticFields![field] },
        }))
      : []),
    ...(definition.metadata != null
      ? [{ script: { source: cleanScript(createMetadataPainlessScript(definition)) } }]
      : []),
    {
      remove: {
        field: 'entity.metadata',
        ignore_missing: true,
      },
    },
    ...liftIdentityFieldsToDocumentRoot(definition),
    {
      remove: {
        field: 'entity.identity',
        ignore_missing: true,
      },
    },
    // This must happen AFTER we lift the identity fields into the root of the document
    {
      set: {
        field: 'entity.display_name',
        value: definition.displayNameTemplate,
      },
    },
    {
      set: {
        field: '_index',
        value: `${generateLatestIndexName(definition)}`,
      },
    },
    ...getCustomIngestPipelines(definition),
  ];
}

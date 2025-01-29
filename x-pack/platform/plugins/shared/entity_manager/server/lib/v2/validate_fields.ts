/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { without } from 'lodash';
import { Logger } from '@kbn/logging';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { EntitySourceDefinition } from './types';

// verifies field capabilities of the provided source.
// we map source fields in two categories:
// - mandatory: those are necessary for building entities according to the
//   source definition (identity_fields, timestamp_field and display_name).
//   unmapped mandatory field throws an error
// - optional: the requested metadata fields. unmapped metadata field is not
//   fatal, we simply ignore it
// returns the available metadata fields.
export async function validateFields({
  esClient,
  source,
  logger,
  metadataFields = [],
}: {
  esClient: ElasticsearchClient;
  source: EntitySourceDefinition;
  logger: Logger;
  metadataFields?: string[];
}) {
  const mandatoryFields = [
    ...source.identity_fields,
    ...(source.timestamp_field ? [source.timestamp_field] : []),
    ...(source.display_name ? [source.display_name] : []),
  ];
  const metaFields = [...metadataFields, ...source.metadata_fields];

  const { fields } = await esClient
    .fieldCaps({
      index: source.index_patterns,
      fields: [...mandatoryFields, ...metaFields],
    })
    .catch((err) => {
      if (err.meta?.statusCode === 404) {
        throw new Error(
          `No index found for source [source: ${source.id}, type: ${
            source.type_id
          }] with index patterns [${source.index_patterns.join(', ')}]`
        );
      }
      throw err;
    });

  const sourceHasMandatoryFields = mandatoryFields.every((field) => !!fields[field]);
  if (!sourceHasMandatoryFields) {
    const missingFields = mandatoryFields.filter((field) => !fields[field]);
    throw new Error(
      `Mandatory fields [${missingFields.join(', ')}] are not mapped for source [source: ${
        source.id
      }, type: ${source.type_id}] with index patterns [${source.index_patterns.join(', ')}]`
    );
  }

  // operations on an unmapped field result in a failing query
  const availableMetadataFields = metaFields.filter((field) => fields[field]);
  if (availableMetadataFields.length < metaFields.length) {
    logger.info(
      `Ignoring unmapped metadata fields [${without(metaFields, ...availableMetadataFields).join(
        ', '
      )}] for source [source: ${source.id}, type: ${source.type_id}]`
    );
  }
  return availableMetadataFields;
}

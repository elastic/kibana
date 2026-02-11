/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesResolveIndexResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { EsResourceType } from '@kbn/agent-builder-common';
import type { MappingField } from '../mappings';
import { flattenMapping, getIndexMappings, getDataStreamMappings } from '../mappings';
import { processFieldCapsResponse } from '../field_caps';

export interface ResolveResourceResponse {
  /** name of the resource */
  name: string;
  /** type of the resource*/
  type: EsResourceType;
  /** list of fields */
  fields: MappingField[];
  /** description from the meta, if available */
  description?: string;
}

/**
 * Retrieve the field list and other relevant info from the given resource name (index, alias or datastream)
 * Note: this can target a single resource, the resource name must not be a pattern.
 */
export const resolveResource = async ({
  resourceName,
  esClient,
}: {
  resourceName: string;
  esClient: ElasticsearchClient;
}): Promise<ResolveResourceResponse> => {
  if (resourceName.includes(',') || resourceName.includes('*')) {
    throw new Error(
      `Tried to resolve resource for multiple resources using pattern ${resourceName}`
    );
  }

  let resolveRes: IndicesResolveIndexResponse;
  try {
    resolveRes = await esClient.indices.resolveIndex({
      name: [resourceName],
      allow_no_indices: false,
    });
  } catch (e) {
    if (isNotFoundError(e)) {
      throw new Error(`No resource found for '${resourceName}'`);
    }
    throw e;
  }

  const resourceCount =
    resolveRes.indices.length + resolveRes.aliases.length + resolveRes.data_streams.length;

  if (resourceCount !== 1) {
    throw new Error(`Found multiple targets when trying to resolve resource for ${resourceName}`);
  }

  // target is an index
  if (resolveRes.indices.length > 0) {
    const indexName = resolveRes.indices[0].name;
    const mappingRes = await getIndexMappings({ indices: [indexName], esClient, cleanup: true });
    const mappings = mappingRes[indexName].mappings;
    const fields = flattenMapping(mappings);
    return {
      name: resourceName,
      type: EsResourceType.index,
      fields,
      description: mappings._meta?.description,
    };
  }
  // target is a datastream
  if (resolveRes.data_streams.length > 0) {
    const datastream = resolveRes.data_streams[0].name;
    const mappingRes = await getDataStreamMappings({
      datastreams: [datastream],
      esClient,
      cleanup: true,
    });
    const mappings = mappingRes[datastream].mappings;
    const fields = flattenMapping(mappings);
    return {
      name: resourceName,
      type: EsResourceType.dataStream,
      fields,
      description: mappings._meta?.description,
    };
  }
  // target is an alias
  if (resolveRes.aliases.length > 0) {
    const alias = resolveRes.aliases[0].name;

    const fieldCapRes = await esClient.fieldCaps({
      index: alias,
      fields: ['*'],
    });

    const { fields } = processFieldCapsResponse(fieldCapRes);

    return {
      name: resourceName,
      type: EsResourceType.alias,
      fields,
    };
  }

  throw new Error(`No resource found for pattern ${resourceName}`);
};

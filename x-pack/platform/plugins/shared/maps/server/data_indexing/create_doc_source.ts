/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesCreateRequest,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, IScopedClusterClient } from '@kbn/core/server';
import { DataViewsCommonService } from '@kbn/data-plugin/server';
import { CreateDocSourceResp } from '../../common/types';
import { MAPS_NEW_VECTOR_LAYER_META_CREATED_BY } from '../../common/constants';

const DEFAULT_META = {
  _meta: {
    created_by: MAPS_NEW_VECTOR_LAYER_META_CREATED_BY,
  },
};

export async function createDocSource(
  index: string,
  mappings: MappingTypeMapping,
  { asCurrentUser }: IScopedClusterClient,
  indexPatternsService: DataViewsCommonService
): Promise<CreateDocSourceResp> {
  try {
    await createIndex(index, mappings, asCurrentUser);
    const { id: indexPatternId } = await indexPatternsService.createAndSave({ title: index }, true);

    return {
      indexPatternId,
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

async function createIndex(
  indexName: string,
  mappings: MappingTypeMapping,
  asCurrentUser: ElasticsearchClient
) {
  const body: IndicesCreateRequest['body'] = {
    mappings: {
      ...DEFAULT_META,
      ...mappings,
    },
  };

  await asCurrentUser.indices.create({ index: indexName, body });
}

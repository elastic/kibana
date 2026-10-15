/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

import type { TransformId } from '../../../../common/types/transform';
import type { PostTransformsUpdateRequestSchema } from '../../api_schemas/update_transforms';

const getExistingTransform = async (
  esClient: ElasticsearchClient,
  transformId: TransformId
): Promise<estypes.TransformGetTransformTransformSummary | undefined> => {
  const response = await esClient.transform.getTransform({ transform_id: transformId });
  return response.transforms[0];
};

const getUpdateBody = (
  body: PostTransformsUpdateRequestSchema,
  existingTransform?: estypes.TransformGetTransformTransformSummary
): PostTransformsUpdateRequestSchema => {
  if (!body.source || !existingTransform?.source) {
    return body;
  }

  return {
    ...body,
    source: {
      ...existingTransform.source,
      ...body.source,
    },
  };
};

const isPartialProjectRoutingUpdate = ({ source }: PostTransformsUpdateRequestSchema): boolean => {
  return (
    source?.project_routing !== undefined &&
    source.index === undefined &&
    source.query === undefined &&
    source.runtime_mappings === undefined
  );
};

export const updateTransform = async ({
  body,
  esClient,
  transformId,
}: {
  body: PostTransformsUpdateRequestSchema;
  esClient: ElasticsearchClient;
  transformId: TransformId;
}) => {
  const existingTransform = isPartialProjectRoutingUpdate(body)
    ? await getExistingTransform(esClient, transformId)
    : undefined;
  const updateBody = getUpdateBody(body, existingTransform);

  return esClient.transform.updateTransform({
    // @ts-expect-error query doesn't satisfy QueryDslQueryContainer from @elastic/elasticsearch
    body: updateBody,
    transform_id: transformId,
  });
};

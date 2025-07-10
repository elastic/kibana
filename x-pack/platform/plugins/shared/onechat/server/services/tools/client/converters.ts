/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ToolDescriptor } from '@kbn/onechat-common';
import { ToolTypeCreateParams, ToolTypeUpdateParams } from '../tool_provider';
import type { ToolProperties } from './storage';

export type Document = Pick<GetResponse<ToolProperties>, '_source' | '_id'>;

export const fromEs = (document: Document): ToolDescriptor<Record<string, unknown>> => {
  if (!document._source) {
    throw new Error('No source found on get conversation response');
  }
  return {
    id: document._id,
    type: document._source.type,
    description: document._source.description,
    tags: document._source.tags,
    configuration: document._source.configuration,
  };
};

export const createAttributes = ({
  createRequest,
}: {
  createRequest: ToolTypeCreateParams;
}): ToolProperties => {
  return {
    id: createRequest.id,
    type: createRequest.type,
    description: createRequest.description ?? '',
    tags: createRequest.tags ?? [],
    configuration: createRequest.configuration,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const updateDocument = ({
  current,
  update,
  updateDate = new Date(),
}: {
  current: ToolProperties;
  update: ToolTypeUpdateParams;
  updateDate?: Date;
}): ToolProperties => {
  // TODO
};

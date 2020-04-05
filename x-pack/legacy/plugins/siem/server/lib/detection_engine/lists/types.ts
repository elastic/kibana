/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '../routes/schemas/common/schemas';

export interface BaseElasticListType {
  name: string;
  description: string;
  type: Type;
  tie_breaker_id: string;
  meta?: object; // TODO: Implement this in the code
  created_at: string;
  updated_at: string;

  // TODO: Figure out how to implement these below
  // created_by: string;
  // modified_by: string;
}

export type ElasticListReturnType = BaseElasticListType;
export type ElasticListInputType = BaseElasticListType;

export interface BaseElasticListItemType {
  list_id: string;
  created_at: string;
  updated_at: string;
  tie_breaker_id: string;
  meta?: object; // TODO: Implement this in the code
}

export type ElasticListItemReturnType = BaseElasticListItemType & {
  ip: string | null | undefined;
  keyword: string | null | undefined;
};

export type ElasticListItemsType =
  | {
      ip: string;
    }
  | {
      keyword: string;
    };

export type ElasticListItemsInputType = BaseElasticListItemType & ElasticListItemsType;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface BaseElasticType {
  list_id: string;
  created_at: string;
  tie_breaker_id: string;
  updated_at: string;
}

export type ElasticReturnType = BaseElasticType & {
  ip: string | null | undefined;
  string: string | null | undefined;
};

export type ListItemsElasticType =
  | {
      ip: string;
    }
  | {
      string: string;
    };

export type ElasticInputType = BaseElasticType & ListItemsElasticType;

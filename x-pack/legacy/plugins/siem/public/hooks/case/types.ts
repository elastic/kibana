/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsBaseOptions } from 'kibana/server';
import { Direction, Maybe } from '../../graphql/types';
export { Direction };
export interface CasesSavedObjects {
  saved_objects: Array<Maybe<CaseSavedObject>>;

  page: number;

  per_page: number;

  total: number;
}

export interface CaseSavedObject {
  attributes: CaseResult;

  id: string;

  type: string;

  updated_at: string;

  version: string;
}
export interface CaseResult {
  case_type: string;

  created_at: number;

  created_by: ElasticUser;

  description: string;

  state: string;

  tags: Array<Maybe<string>>;

  title: string;
}
export interface SortCase {
  field: SortFieldCase;
  direction: Direction;
}
export enum SortFieldCase {
  createdAt = 'created_at',
  state = 'state',
  updatedAt = 'updated_at',
}
export interface CaseFindOptions extends SavedObjectsBaseOptions {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  /**
   * An array of fields to include in the results
   * @example
   * SavedObjects.find({type: 'dashboard', fields: ['attributes.name', 'attributes.location']})
   */
  fields?: string[];
  /** Search documents using the Elasticsearch Simple Query String syntax. See Elasticsearch Simple Query String `query` argument for more information */
  search?: string;
  /** The fields to perform the parsed query against. See Elasticsearch Simple Query String `fields` argument for more information */
  searchFields?: string[];
  hasReference?: { type: string; id: string };
  defaultSearchOperator?: 'AND' | 'OR';
  filter?: string;
}

export interface ElasticUser {
  username: string;
  full_name?: Maybe<string>;
}

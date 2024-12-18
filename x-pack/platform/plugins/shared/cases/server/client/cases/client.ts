/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case, CaseCustomField, Cases, User } from '../../../common/types/domain';
import type {
  CasePostRequest,
  CasesFindResponse,
  CaseResolveResponse,
  CasesBulkGetRequest,
  CasesPatchRequest,
  AllTagsFindRequest,
  AllCategoriesFindRequest,
  AllReportersFindRequest,
  GetRelatedCasesByAlertResponse,
  CasesBulkGetResponse,
  BulkCreateCasesRequest,
  BulkCreateCasesResponse,
  CasesSearchRequest,
} from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientInternal } from '../client_internal';
import type { CasesClientArgs } from '../types';
import { bulkGet } from './bulk_get';
import { create } from './create';
import { deleteCases } from './delete';
import { search } from './search';
import type { CasesByAlertIDParams, GetParams } from './get';
import { get, resolve, getCasesByAlertID, getReporters, getTags, getCategories } from './get';
import type { PushParams } from './push';
import { push } from './push';
import { bulkUpdate } from './bulk_update';
import { bulkCreate } from './bulk_create';
import type { ReplaceCustomFieldArgs } from './replace_custom_field';
import { replaceCustomField } from './replace_custom_field';

/**
 * API for interacting with the cases entities.
 */
export interface CasesSubClient {
  /**
   * Creates a case.
   */
  create(data: CasePostRequest): Promise<Case>;
  /**
   * Bulk create cases.
   */
  bulkCreate(data: BulkCreateCasesRequest): Promise<BulkCreateCasesResponse>;
  /**
   * Returns cases that match the search criteria.
   *
   * If the `owner` field is left empty then all the cases that the user has access to will be returned.
   */
  search(params: CasesSearchRequest): Promise<CasesFindResponse>;
  /**
   * Retrieves a single case with the specified ID.
   */
  get(params: GetParams): Promise<Case>;
  /**
   * @experimental
   * Retrieves a single case resolving the specified ID.
   */
  resolve(params: GetParams): Promise<CaseResolveResponse>;
  /**
   * Retrieves multiple cases with the specified IDs.
   */
  bulkGet(params: CasesBulkGetRequest): Promise<CasesBulkGetResponse>;
  /**
   * Pushes a specific case to an external system.
   */
  push(args: PushParams): Promise<Case>;
  /**
   * Update the specified cases with the passed in values.
   */
  bulkUpdate(cases: CasesPatchRequest): Promise<Cases>;
  /**
   * Delete a case and all its comments.
   *
   * @params ids an array of case IDs to delete
   */
  delete(ids: string[]): Promise<void>;
  /**
   * Retrieves all the tags across all cases the user making the request has access to.
   */
  getTags(params: AllTagsFindRequest): Promise<string[]>;
  /**
   * Retrieves all the categories across all cases the user making the request has access to.
   */
  getCategories(params: AllCategoriesFindRequest): Promise<string[]>;
  /**
   * Retrieves all the reporters across all accessible cases.
   */
  getReporters(params: AllReportersFindRequest): Promise<User[]>;
  /**
   * Retrieves the cases ID and title that have the requested alert attached to them
   */
  getCasesByAlertID(params: CasesByAlertIDParams): Promise<GetRelatedCasesByAlertResponse>;
  /**
   * Replace custom field with specific customFieldId and CaseId
   */
  replaceCustomField(params: ReplaceCustomFieldArgs): Promise<CaseCustomField>;
}

/**
 * Creates the interface for CRUD on cases objects.
 *
 * @ignore
 */
export const createCasesSubClient = (
  clientArgs: CasesClientArgs,
  casesClient: CasesClient,
  casesClientInternal: CasesClientInternal
): CasesSubClient => {
  const casesSubClient: CasesSubClient = {
    create: (data: CasePostRequest) => create(data, clientArgs, casesClient),
    bulkCreate: (data: BulkCreateCasesRequest) => bulkCreate(data, clientArgs, casesClient),
    search: (params: CasesSearchRequest) => search(params, clientArgs, casesClient),
    get: (params: GetParams) => get(params, clientArgs),
    resolve: (params: GetParams) => resolve(params, clientArgs),
    bulkGet: (params) => bulkGet(params, clientArgs),
    push: (params: PushParams) => push(params, clientArgs, casesClient),
    bulkUpdate: (cases: CasesPatchRequest) => bulkUpdate(cases, clientArgs, casesClient),
    delete: (ids: string[]) => deleteCases(ids, clientArgs),
    getTags: (params: AllTagsFindRequest) => getTags(params, clientArgs),
    getCategories: (params: AllCategoriesFindRequest) => getCategories(params, clientArgs),
    getReporters: (params: AllReportersFindRequest) => getReporters(params, clientArgs),
    getCasesByAlertID: (params: CasesByAlertIDParams) => getCasesByAlertID(params, clientArgs),
    replaceCustomField: (params: ReplaceCustomFieldArgs) =>
      replaceCustomField(params, clientArgs, casesClient),
  };

  return Object.freeze(casesSubClient);
};

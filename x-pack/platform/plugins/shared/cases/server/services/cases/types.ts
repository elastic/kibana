/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Case } from '../../../common/types/domain';
import type { IndexRefresh } from '../types';
import type { User } from '../../common/types/user';
import type {
  CaseSavedObjectTransformed,
  CaseTransformedAttributes,
} from '../../common/types/case';
import type { SavedObjectFindOptionsKueryNode } from '../../common/types';

export interface GetCaseIdsByAlertIdArgs {
  alertId: string;
  filter?: KueryNode;
}

export interface PushedArgs {
  pushed_at: string;
  pushed_by: User;
}

export interface GetCaseArgs {
  id: string;
}

export interface DeleteCaseArgs extends GetCaseArgs, IndexRefresh {}

export interface GetCasesArgs {
  caseIds: string[];
}

export interface FindCommentsArgs {
  id: string | string[];
  options?: SavedObjectFindOptionsKueryNode;
}

export interface FindCaseCommentsArgs {
  id: string | string[];
  options?: SavedObjectFindOptionsKueryNode;
}

export interface CreateCaseArgs extends IndexRefresh {
  attributes: CaseTransformedAttributes;
  id: string;
}

export interface BulkCreateCasesArgs extends IndexRefresh {
  cases: Array<{ id: string } & CaseTransformedAttributes>;
}

export interface PatchCase extends IndexRefresh {
  caseId: string;
  updatedAttributes: Partial<CaseTransformedAttributes & PushedArgs>;
  originalCase: CaseSavedObjectTransformed;
  version?: string;
}

export type PatchCaseArgs = PatchCase;

export interface PatchCasesArgs extends IndexRefresh {
  cases: Array<Omit<PatchCase, 'refresh'>>;
}

export interface CasesMapWithPageInfo {
  casesMap: Map<string, Case>;
  page: number;
  perPage: number;
  total: number;
}

export interface GetTagsArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  filter?: KueryNode;
}

export interface GetReportersArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  filter?: KueryNode;
}

export interface GetCategoryArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  filter?: KueryNode;
}

export interface GetCaseIdsByAlertIdAggs {
  references: {
    doc_count: number;
    caseIds: {
      buckets: Array<{ key: string }>;
    };
  };
}

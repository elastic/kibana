/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppResolverWithFields, AppResolverOf } from '../../lib/framework';
import { MutationResolvers, QueryResolvers } from '../types';
import { Case } from '../../lib/case/saved_object';

export type QueryCaseResolver = AppResolverOf<QueryResolvers.GetCaseResolver>;

export type QueryAllCaseResolver = AppResolverWithFields<
  QueryResolvers.GetAllCasesResolver,
  'totalCount' | 'Case'
>;

export type MutationDeleteCaseResolver = AppResolverOf<MutationResolvers.DeleteCaseResolver>;

interface CaseResolversDeps {
  case: Case;
}

export const createCaseResolvers = (
  libs: CaseResolversDeps
): {
  Query: {
    getCase: QueryCaseResolver;
    getAllCases: QueryAllCaseResolver;
  };
  Mutation: {
    deleteCase: MutationDeleteCaseResolver;
  };
} => ({
  Query: {
    async getCase(root, args, { req }) {
      return libs.case.getCase(req, args.caseId);
    },
    async getAllCases(root, args, { req }) {
      return libs.case.getAllCases(
        req,
        args.pageInfo || null,
        args.search || null,
        args.sort || null
      );
    },
  },
  Mutation: {
    async deleteCase(root, args, { req }) {
      await libs.case.deleteCase(req, args.id);

      return true;
    },
  },
});

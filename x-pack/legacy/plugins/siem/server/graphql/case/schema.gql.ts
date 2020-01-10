/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const caseSchema = gql`
  ###############
  #### QUERY ####
  ###############
  type ElasticUser {
    username: String!
    full_name: String
  }
  type CaseResult {
    case_type: String!
    created_at: Float!
    created_by: ElasticUser!
    description: String!
    state: String!
    tags: [String]!
    title: String!
  }

  type CaseSavedObject {
    attributes: CaseResult!
    id: String!
    type: String!
    updated_at: String!
    version: String!
  }

  type CasesSavedObjects {
    saved_objects: [CaseSavedObject]!
    page: Float!
    per_page: Float!
    total: Float!
  }

  #########################
  ####  Mutation/Query ####
  #########################

  extend type Query {
    getCase(caseId: ID!): CaseSavedObject!
    getCases(search: String): CasesSavedObjects!
  }

  extend type Mutation {
    deleteCase(id: [ID!]!): Boolean
  }
`;

//
// input PageInfoCase {
//   pageIndex: Float!
//   pageSize: Float!
// }
//
// enum SortFieldCase {
//   updatedBy
//   updated
// }
//
// input SortCase {
//   sortField: SortFieldCase!
//   sortOrder: Direction!
// }

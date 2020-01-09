/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const caseSchema = gql`
  ###############
  #### INPUT ####
  ###############

  input CaseInput {
    caseId: String
  }

  input PageInfoCase {
    pageIndex: Float!
    pageSize: Float!
  }

  enum SortFieldCase {
    updatedBy
    updated
  }

  input SortCase {
    sortField: SortFieldCase!
    sortOrder: Direction!
  }

  ###############
  #### QUERY ####
  ###############
  type ElasticUser {
    username: String!
    full_name: String
  }
  type CaseResult {
    assignees: [ElasticUser]!
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

  type ResponseCases {
    cases: [CaseResult!]!
    totalCount: Float
  }

  #########################
  ####  Mutation/Query ####
  #########################

  extend type Query {
    getCase(caseId: ID!): CaseSavedObject!
    getAllCases(pageInfo: PageInfoCase, search: String, sort: SortCase): ResponseCases!
  }

  extend type Mutation {
    deleteCase(id: [ID!]!): Boolean
  }
`;

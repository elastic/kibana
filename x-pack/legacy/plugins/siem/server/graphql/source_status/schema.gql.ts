/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sourceStatusSchema = gql`
  "A descriptor of a field in an index"
  type IndexField {
    "Where the field belong"
    category: String!
    "Example of field's value"
    example: String
    "whether the field's belong to an alias index"
    indexes: [String]!
    "The name of the field"
    name: String!
    "The type of the field's values as recognized by Kibana"
    type: String!
    "Whether the field's values can be efficiently searched for"
    searchable: Boolean!
    "Whether the field's values can be aggregated"
    aggregatable: Boolean!
    "Description of the field"
    description: String
  }

  extend type SourceStatus {
    "Whether the configured alias or wildcard pattern resolve to any auditbeat indices"
    indicesExist(defaultIndex: [String!]!): Boolean!
    "The list of fields defined in the index mappings"
    indexFields(defaultIndex: [String!]!): [IndexField!]!
  }
`;

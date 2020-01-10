/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const casesQuery = gql`
  query GetCasesQuery($search: String) {
    getCases(search: $search) {
      page
      per_page
      total
      saved_objects {
        id
        type
        updated_at
        version
        attributes {
          case_type
          created_at
          created_by {
            username
            full_name
          }
          description
          state
          tags
          title
        }
      }
    }
  }
`;

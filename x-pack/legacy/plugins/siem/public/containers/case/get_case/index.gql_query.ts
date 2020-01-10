/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const caseQuery = gql`
  query GetCaseQuery($caseId: ID!) {
    getCase(caseId: $caseId) {
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
`;

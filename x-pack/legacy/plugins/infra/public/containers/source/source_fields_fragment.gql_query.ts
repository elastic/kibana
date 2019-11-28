/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sourceConfigurationFieldsFragment = gql`
  fragment SourceConfigurationFields on InfraSourceConfiguration {
    name
    description
    logAlias
    metricAlias
    fields {
      container
      host
      message
      pod
      tiebreaker
      timestamp
    }
    logColumns {
      ... on InfraSourceTimestampLogColumn {
        timestampColumn {
          id
        }
      }
      ... on InfraSourceMessageLogColumn {
        messageColumn {
          id
        }
      }
      ... on InfraSourceFieldLogColumn {
        fieldColumn {
          id
          field
        }
      }
    }
  }
`;

export const sourceStatusFieldsFragment = gql`
  fragment SourceStatusFields on InfraSourceStatus {
    indexFields {
      name
      type
      searchable
      aggregatable
      displayable
    }
    logIndicesExist
    metricIndicesExist
  }
`;

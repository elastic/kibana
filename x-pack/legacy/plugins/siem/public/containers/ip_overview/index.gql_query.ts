/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const ipOverviewQuery = gql`
  query GetIpOverviewQuery(
    $sourceId: ID!
    $filterQuery: String
    $ip: String!
    $defaultIndex: [String!]!
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      IpOverview(filterQuery: $filterQuery, ip: $ip, defaultIndex: $defaultIndex) {
        source {
          firstSeen
          lastSeen
          autonomousSystem {
            number
            organization {
              name
            }
          }
          geo {
            continent_name
            city_name
            country_iso_code
            country_name
            location {
              lat
              lon
            }
            region_iso_code
            region_name
          }
        }
        destination {
          firstSeen
          lastSeen
          autonomousSystem {
            number
            organization {
              name
            }
          }
          geo {
            continent_name
            city_name
            country_iso_code
            country_name
            location {
              lat
              lon
            }
            region_iso_code
            region_name
          }
        }
        host {
          architecture
          id
          ip
          mac
          name
          os {
            family
            name
            platform
            version
          }
          type
        }
        inspect @include(if: $inspect) {
          dsl
          response
        }
      }
    }
  }
`;

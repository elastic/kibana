/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const timelineQuery = gql`
  query GetTimelineQuery(
    $sourceId: ID!
    $fieldRequested: [String!]!
    $pagination: PaginationInput!
    $sortField: SortField!
    $filterQuery: String
    $defaultIndex: [String!]!
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      Timeline(
        fieldRequested: $fieldRequested
        pagination: $pagination
        sortField: $sortField
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
      ) {
        totalCount
        inspect @include(if: $inspect) {
          dsl
          response
        }
        pageInfo {
          endCursor {
            value
            tiebreaker
          }
          hasNextPage
        }
        edges {
          node {
            _id
            _index
            data {
              field
              value
            }
            ecs {
              _id
              _index
              timestamp
              message
              system {
                auth {
                  ssh {
                    signature
                    method
                  }
                }
                audit {
                  package {
                    arch
                    entity_id
                    name
                    size
                    summary
                    version
                  }
                }
              }
              event {
                action
                category
                code
                created
                dataset
                duration
                end
                hash
                id
                kind
                module
                original
                outcome
                risk_score
                risk_score_norm
                severity
                start
                timezone
                type
              }
              auditd {
                result
                session
                data {
                  acct
                  terminal
                  op
                }
                summary {
                  actor {
                    primary
                    secondary
                  }
                  object {
                    primary
                    secondary
                    type
                  }
                  how
                  message_type
                  sequence
                }
              }
              file {
                name
                path
                target_path
                extension
                type
                device
                inode
                uid
                owner
                gid
                group
                mode
                size
                mtime
                ctime
              }
              host {
                id
                name
                ip
              }
              rule {
                reference
              }
              source {
                bytes
                ip
                packets
                port
                geo {
                  continent_name
                  country_name
                  country_iso_code
                  city_name
                  region_iso_code
                  region_name
                }
              }
              destination {
                bytes
                ip
                packets
                port
                geo {
                  continent_name
                  country_name
                  country_iso_code
                  city_name
                  region_iso_code
                  region_name
                }
              }
              dns {
                question {
                  name
                  type
                }
                resolved_ip
                response_code
              }
              endgame {
                exit_code
                file_name
                file_path
                logon_type
                parent_process_name
                pid
                process_name
                subject_domain_name
                subject_logon_id
                subject_user_name
                target_domain_name
                target_logon_id
                target_user_name
              }
              geo {
                region_name
                country_iso_code
              }
              signal {
                original_time
                rule {
                  id
                  saved_id
                  timeline_id
                  timeline_title
                  output_index
                  from
                  index
                  language
                  query
                  to
                  filters
                }
              }
              suricata {
                eve {
                  proto
                  flow_id
                  alert {
                    signature
                    signature_id
                  }
                }
              }
              network {
                bytes
                community_id
                direction
                packets
                protocol
                transport
              }
              http {
                version
                request {
                  method
                  body {
                    bytes
                    content
                  }
                  referrer
                }
                response {
                  status_code
                  body {
                    bytes
                    content
                  }
                }
              }
              tls {
                client_certificate {
                  fingerprint {
                    sha1
                  }
                }
                fingerprints {
                  ja3 {
                    hash
                  }
                }
                server_certificate {
                  fingerprint {
                    sha1
                  }
                }
              }
              url {
                original
                domain
                username
                password
              }
              user {
                domain
                name
              }
              winlog {
                event_id
              }
              process {
                hash {
                  md5
                  sha1
                  sha256
                }
                pid
                name
                ppid
                args
                executable
                title
                working_directory
              }
              zeek {
                session_id
                connection {
                  local_resp
                  local_orig
                  missed_bytes
                  state
                  history
                }
                notice {
                  suppress_for
                  msg
                  note
                  sub
                  dst
                  dropped
                  peer_descr
                }
                dns {
                  AA
                  qclass_name
                  RD
                  qtype_name
                  rejected
                  qtype
                  query
                  trans_id
                  qclass
                  RA
                  TC
                }
                http {
                  resp_mime_types
                  trans_depth
                  status_msg
                  resp_fuids
                  tags
                }
                files {
                  session_ids
                  timedout
                  local_orig
                  tx_host
                  source
                  is_orig
                  overflow_bytes
                  sha1
                  duration
                  depth
                  analyzers
                  mime_type
                  rx_host
                  total_bytes
                  fuid
                  seen_bytes
                  missing_bytes
                  md5
                }
                ssl {
                  cipher
                  established
                  resumed
                  version
                }
              }
            }
          }
        }
      }
    }
  }
`;

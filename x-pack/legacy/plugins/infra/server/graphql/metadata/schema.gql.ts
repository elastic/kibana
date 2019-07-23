/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const metadataSchema = gql`
  "The cloud instance object for the node"
  type InfraNodeCloudInstance {
    id: ID
    name: String
  }

  "The cloud project object for the node"
  type InfraNodeCloudProject {
    id: ID
  }

  "The cloud object for the node"
  type InfraNodeCloud {
    instance: InfraNodeCloudInstance
    provider: String
    availability_zone: String
    project: InfraNodeCloudProject
  }

  "The operation system object for the node"
  type InfraNodeHostOS {
    codename: String
    family: String
    kernel: String
    name: String
    platform: String
    version: String
  }

  "The host object for the node"
  type InfraNodeHost {
    name: String
    os: InfraNodeHostOS
    architecture: String
    containerized: Boolean
  }

  "The info object for the node"
  type InfraNodeInfo {
    host: InfraNodeHost
    cloud: InfraNodeCloud
  }

  "One metadata entry for a node."
  type InfraNodeMetadata {
    id: ID!
    name: String!
    info: InfraNodeInfo
    features: [InfraNodeFeature!]!
  }

  type InfraNodeFeature {
    name: String!
    source: String!
  }

  extend type InfraSource {
    "A hierarchy of metadata entries by node"
    metadataByNode(nodeId: String!, nodeType: InfraNodeType!): InfraNodeMetadata!
  }
`;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CodeNode } from './code_nodes';

/**
 * The service is used to manage the membership of the node in the cluster.
 * It may actively add or remove members of the cluster.
 *
 * Migration Plan:
 *
 */
export interface ClusterMembershipService {
  // the information of the local node
  readonly localNode: CodeNode;

  start(): Promise<void>;

  stop(): Promise<void>;
}

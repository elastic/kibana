/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterState } from './cluster_state';

/**
 * An object indicates cluster state changes.
 */
export class ClusterStateEvent {
  constructor(public readonly current: ClusterState, public readonly prev: ClusterState) {}
}

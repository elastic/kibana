/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { clusters } from './clusters';
import { detailPanel } from './detail_panel';
import { addCluster } from './add_cluster';
import { removeCluster } from './remove_cluster';
import { editCluster } from './edit_cluster';

export const remoteClusters = combineReducers({
  clusters,
  detailPanel,
  addCluster,
  removeCluster,
  editCluster,
});

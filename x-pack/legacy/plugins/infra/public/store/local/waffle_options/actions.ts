/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { SnapshotGroupBy, SnapshotMetricInput } from '../../../../common/http_api/snapshot_api';
import { InventoryItemType } from '../../../../common/inventory_models/types';
import { InfraGroupByOptions, InfraWaffleMapBounds } from '../../../lib/lib';

const actionCreator = actionCreatorFactory('x-pack/infra/local/waffle_options');

export const changeMetric = actionCreator<SnapshotMetricInput>('CHANGE_METRIC');
export const changeGroupBy = actionCreator<SnapshotGroupBy>('CHANGE_GROUP_BY');
export const changeCustomOptions = actionCreator<InfraGroupByOptions[]>('CHANGE_CUSTOM_OPTIONS');
export const changeNodeType = actionCreator<InventoryItemType>('CHANGE_NODE_TYPE');
export const changeView = actionCreator<string>('CHANGE_VIEW');
export const changeBoundsOverride = actionCreator<InfraWaffleMapBounds>('CHANGE_BOUNDS_OVERRIDE');
export const changeAutoBounds = actionCreator<boolean>('CHANGE_AUTO_BOUNDS');
export const changeAccount = actionCreator<string>('CHANGE_ACCOUNT');
export const changeRegion = actionCreator<string>('CHANGE_REGION');

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getEcsGroups } from './src/get_ecs_groups';
export {
  unflattenGrouping,
  getFormattedGroups,
  getFormattedGroupBy,
  getGroupByObject,
} from './src/group_by_object_utils';
export type { Group, FieldsObject } from './src/types';

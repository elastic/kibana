/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum RoleTransformErrorReason {
  RESERVED_PRIVILEGES_MIXED = 'reserved_privileges_mixed',
  RESERVED_PRIVILEGES_WRONG_APP = 'reserved_privileges_wrong_app',
  SPACE_PRIVILEGES_GLOBAL = 'space_privileges_global',
  GLOBAL_PRIVILEGES_SPACE = 'global_privileges_space',
  BASE_FEATURE_PRIVILEGES_MIXED = 'base_feature_privileges_mixed',
  GLOBAL_RESOURCE_MIXED = 'global_resource_mixed',
  INVALID_RESOURCE_FORMAT = 'invalid_resource_format',
  DUPLICATED_RESOURCES = 'duplicated_resources',
  FEATURE_REQUIRES_ALL_SPACES = 'feature_requires_all_spaces',
  DISABLED_FEATURE_PRIVILEGES = 'disabled_feature_privileges',
  TRANSFORMATION_EXCEPTION = 'transformation_exception',
}

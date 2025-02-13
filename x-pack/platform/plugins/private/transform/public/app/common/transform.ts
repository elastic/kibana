/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import type { TransformConfigUnion, TransformId } from '../../../common/types/transform';

// Via https://github.com/elastic/elasticsearch/blob/master/x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/transform/utils/TransformStrings.java#L24
// Matches a string that contains lowercase characters, digits, hyphens, underscores or dots.
// The string may start and end only in characters or digits.
// Note that '.' is allowed but not documented.
export function isTransformIdValid(transformId: TransformId) {
  return /^[a-z0-9](?:[a-z0-9_\-\.]*[a-z0-9])?$/g.test(transformId);
}

export const TRANSFORM_ERROR_TYPE = {
  DANGLING_TASK: 'dangling_task',
} as const;

export const overrideTransformForCloning = (originalConfig: TransformConfigUnion) => {
  // 'Managed' means job is preconfigured and deployed by other solutions
  // we should not clone this setting
  const clonedConfig = cloneDeep(originalConfig);
  delete clonedConfig._meta?.managed;
  return clonedConfig;
};

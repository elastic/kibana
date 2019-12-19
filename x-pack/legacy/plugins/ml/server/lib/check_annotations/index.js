/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mlLog } from '../../client/log';

import {
  ML_ANNOTATIONS_INDEX_ALIAS_READ,
  ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
  ML_ANNOTATIONS_INDEX_PATTERN,
} from '../../../common/constants/index_patterns';

import { FEATURE_ANNOTATIONS_ENABLED } from '../../../common/constants/feature_flags';

// Annotations Feature is available if:
// - FEATURE_ANNOTATIONS_ENABLED is set to `true`
// - ML_ANNOTATIONS_INDEX_PATTERN index is present
// - ML_ANNOTATIONS_INDEX_ALIAS_READ alias is present
// - ML_ANNOTATIONS_INDEX_ALIAS_WRITE alias is present
export async function isAnnotationsFeatureAvailable(callWithRequest) {
  if (!FEATURE_ANNOTATIONS_ENABLED) return false;

  try {
    const indexParams = { index: ML_ANNOTATIONS_INDEX_PATTERN };

    const annotationsIndexExists = await callWithRequest('indices.exists', indexParams);
    if (!annotationsIndexExists) return false;

    const annotationsReadAliasExists = await callWithRequest('indices.existsAlias', {
      name: ML_ANNOTATIONS_INDEX_ALIAS_READ,
    });

    if (!annotationsReadAliasExists) return false;

    const annotationsWriteAliasExists = await callWithRequest('indices.existsAlias', {
      name: ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
    });
    if (!annotationsWriteAliasExists) return false;
  } catch (err) {
    mlLog.info('Disabling ML annotations feature because the index/alias integrity check failed.');
    return false;
  }

  return true;
}

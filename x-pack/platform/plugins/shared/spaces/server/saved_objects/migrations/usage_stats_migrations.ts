/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { UsageStats } from '../../usage_stats';

export const migrateTo7141 = (doc: SavedObjectUnsanitizedDoc<UsageStats>) => {
  try {
    return resetFields(doc, [
      // Prior to this, we were counting the `overwrite` option incorrectly; reset all copy API counter fields so we get clean data
      'apiCalls.copySavedObjects.total',
      'apiCalls.copySavedObjects.kibanaRequest.yes',
      'apiCalls.copySavedObjects.kibanaRequest.no',
      'apiCalls.copySavedObjects.createNewCopiesEnabled.yes',
      'apiCalls.copySavedObjects.createNewCopiesEnabled.no',
      'apiCalls.copySavedObjects.overwriteEnabled.yes',
      'apiCalls.copySavedObjects.overwriteEnabled.no',
    ]);
  } catch (err) {
    // fail-safe
  }
  return doc;
};

function resetFields(
  doc: SavedObjectUnsanitizedDoc<UsageStats>,
  fieldsToReset: Array<keyof UsageStats>
) {
  const newDoc = cloneDeep(doc);
  const { attributes = {} } = newDoc;
  for (const field of fieldsToReset) {
    attributes[field] = 0;
  }
  return { ...newDoc, attributes };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Default label to be used as the use case
import { Dataset } from '../../../common/types';

const DEFAULT_LABEL = 'default';

/**
 * Creates the base name for Elasticsearch assets in the form of
 * {type}-{label}-{package}-{datasetName}
 */
export function getDatasetAssetBaseName(dataset: Dataset): string {
  return `${dataset.type}-${DEFAULT_LABEL}-${dataset.packageName}-${dataset.name}`;
}

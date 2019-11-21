/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type ValidAssetType = 'dataurl';

export interface AssetType {
  '@created': string;
  id: string;
  type: ValidAssetType;
  value: string;
}

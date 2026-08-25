/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SimpleSOAssetType } from '../../../../../../../../common';

export type AlertingEngine = 'v1' | 'v2';

export type AlertingSOAssetType = SimpleSOAssetType & {
  attributes: SimpleSOAssetType['attributes'] & { engine?: AlertingEngine };
};

export interface AlertingAsset {
  id: string;
  type: SimpleSOAssetType['type'];
  updatedAt?: string;
  appLink?: string;
  attributes?: {
    title?: string;
    description?: string;
    engine?: AlertingEngine;
  };
}

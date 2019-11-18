/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import KbnServer from 'src/legacy/server/kbn_server';
import { Feature, FeatureWithAllOrReadPrivileges } from '../../../plugins/features/server';
import { XPackInfo, XPackInfoOptions } from './server/lib/xpack_info';
export { XPackFeature } from './server/lib/xpack_info';

export type XPackStatus = any;

export interface XPackMainPlugin {
  info: XPackInfo;
  status: XPackStatus;
  createXPackInfo(options: XPackInfoOptions): XPackInfo;
  getFeatures(): Feature[];
  registerFeature(feature: FeatureWithAllOrReadPrivileges): void;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import KbnServer from 'src/legacy/server/kbn_server';
import { Feature, FeatureWithAllOrReadPrivileges } from '../../../../plugins/features/server';
import { XPackInfo, XPackInfoOptions } from './lib/xpack_info';
export { XPackFeature } from './lib/xpack_info';

export interface XPackMainPlugin {
  info: XPackInfo;
  createXPackInfo(options: XPackInfoOptions): XPackInfo;
  getFeatures(): Feature[];
  registerFeature(feature: FeatureWithAllOrReadPrivileges): void;
}

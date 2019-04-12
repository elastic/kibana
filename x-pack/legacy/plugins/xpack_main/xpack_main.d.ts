/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { XPackInfo, XPackInfoOptions } from './server/lib/xpack_info';

export interface XPackMainPlugin {
  info: XPackInfo;
  createXPackInfo(options: XPackInfoOptions): XPackInfo;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { UMFrontendLibs } from '../lib';
import { getKibanaFrameworkAdapter } from '../adapters/framework/new_platform_adapter';

export function compose(): UMFrontendLibs {
  const libs: UMFrontendLibs = {
    framework: getKibanaFrameworkAdapter(npStart.core),
  };

  return libs;
}

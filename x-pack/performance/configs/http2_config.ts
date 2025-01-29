/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { configureHTTP2 } from '@kbn/test-suites-src/common/configure_http2';

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack/functional/config.base')
  );

  return configureHTTP2({
    ...xpackFunctionalConfig.getAll(),
  });
}

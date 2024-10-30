/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginSetup } from '@kbn/share-plugin/public';

export async function getMlLocator(share: SharePluginSetup) {
  const { MlLocatorDefinition } = await import('./ml_locator');
  return share.url.locators.create(new MlLocatorDefinition());
}

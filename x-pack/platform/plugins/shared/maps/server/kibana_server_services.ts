/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/server';

let coreStart: CoreStart;
export function setStartServices(core: CoreStart) {
  coreStart = core;
}

export const getSavedObjectClient = (extraTypes?: string[]) => {
  return coreStart.savedObjects.createInternalRepository(extraTypes);
};

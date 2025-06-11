/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { Installation } from '../../../common';

export const backfillInstallationLatestVersion: SavedObjectModelDataBackfillFn<
  Installation,
  Installation
> = (doc) => {
  if (doc.attributes.latest_version === undefined) {
    doc.attributes.latest_version = true;
  }

  return doc;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentPackEntry } from '@kbn/content-packs-schema';

export function isViewableEntry(entry: ContentPackEntry) {
  const type = entry.type;
  switch (type) {
    case 'dashboard':
    case 'fields':
    case 'processors':
      return true;

    case 'index-pattern':
    case 'lens':
      return false;

    default:
      missingEntryTypeImpl(type);
  }
}

function missingEntryTypeImpl(type: never) {
  throw new Error(`Entry type [${type}] is not implemented`);
}

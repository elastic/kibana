/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ContentPackEntry,
  ContentPackIncludedObjects,
  ContentPackStream,
} from '@kbn/content-packs-schema';
import { isDescendantOf } from '@kbn/streams-schema';

export function prepareIncludePayload(
  allEntries: ContentPackEntry[],
  selectedEntries: ContentPackEntry[]
): ContentPackIncludedObjects {
  const streams = selectedEntries
    .filter((selectedEntry): selectedEntry is ContentPackStream => {
      // only include leaf streams
      return (
        selectedEntry.type === 'stream' &&
        !allEntries.some(
          (entry) => entry.type === 'stream' && isDescendantOf(selectedEntry.name, entry.name)
        )
      );
    })
    .map((entry) => entry.name);

  return { objects: { streams, dashboards: [] } };
}

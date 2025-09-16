/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentPackIncludedObjects, ContentPackStream } from '@kbn/content-packs-schema';
import { isIncludeAll } from '@kbn/content-packs-schema';

export function hasSelectedObjects(includedObjects: ContentPackIncludedObjects): boolean {
  return (
    isIncludeAll(includedObjects) ||
    includedObjects.objects.queries.length > 0 ||
    includedObjects.objects.routing.length > 0
  );
}

export function containsAssets(streams: ContentPackStream[]): boolean {
  return streams.some((stream) => stream.request.queries.length > 0);
}

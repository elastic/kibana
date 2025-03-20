/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { ContentPackSavedObject } from '@kbn/streams-schema';
import { createFilterStream, createMapStream, createSplitStream } from '@kbn/utils';

export function contentPackSavedObjects(content: Readable): Readable {
  return content
    .pipe(createSplitStream('\n'))
    .pipe(createFilterStream((line: string) => line.length > 0))
    .pipe(createMapStream((line: string) => JSON.parse(line)))
    .pipe(createFilterStream((object: any) => object.type === 'saved_object' && object.content))
    .pipe(createMapStream((object: ContentPackSavedObject) => object.content));
}

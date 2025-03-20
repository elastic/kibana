/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable, Transform } from 'stream';
import { ContentPackHeader, contentPackHeaderSchema } from '@kbn/streams-schema';
import { createSplitStream } from '@kbn/utils';

export async function contentPackHeader(content: Readable): Promise<ContentPackHeader> {
  return await new Promise((resolve, reject) =>
    content
      .pipe(createSplitStream('\n'))
      .pipe(
        new Transform({
          objectMode: true,
          transform(line, enc, callback) {
            try {
              const header = contentPackHeaderSchema.parse(JSON.parse(line));
              callback(null, header);
              this.destroy();
            } catch (err) {
              callback(err);
            }
          },
        })
      )
      .on('data', resolve)
      .on('error', reject)
  );
}

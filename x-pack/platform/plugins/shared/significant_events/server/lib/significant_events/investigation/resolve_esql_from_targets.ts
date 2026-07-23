/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStreamSamplingSource, type Streams } from '@kbn/streams-schema';

/**
 * Maps logical stream names to ES|QL `FROM` targets for investigation prompts.
 *
 * Query streams must be queried via their prefixed view (`$.name` / `stream.query.view`),
 * while ingest/classic streams use the bare stream name. Unknown streams fall back to the
 * logical name so callers still get a usable hint.
 */
export const resolveEsqlFromTargets = async ({
  streamNames,
  getStream,
}: {
  streamNames: readonly string[];
  getStream: (name: string) => Promise<Streams.all.Definition>;
}): Promise<string[]> => {
  return Promise.all(
    streamNames.map(async (streamName) => {
      try {
        const stream = await getStream(streamName);
        return getStreamSamplingSource(stream);
      } catch {
        return streamName;
      }
    })
  );
};

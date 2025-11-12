/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { conditionToPainless } from '@kbn/streamlang';
import { ASSET_VERSION } from '../../../../common/constants';
import { getReroutePipelineName } from './name';

interface GenerateReroutePipelineParams {
  definition: Streams.WiredStream.Definition;
}

export function generateReroutePipeline({ definition }: GenerateReroutePipelineParams) {
  return {
    id: getReroutePipelineName(definition.name),
    processors: [
      // server side routing
      ...definition.ingest.wired.routing
        .filter((child) => child.status !== 'disabled')
        .map((child) => {
          return {
            reroute: {
              destination: child.destination,
              if: conditionToPainless(child.where),
            },
          };
        }),
    ],
    _meta: {
      description: `Reroute pipeline for the ${definition.name} stream`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}

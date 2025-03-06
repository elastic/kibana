/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestStreamDefinition, WiredStreamDefinition } from '@kbn/streams-schema';
import { ASSET_VERSION } from '../../../../common/constants';
import { conditionToPainless } from '../helpers/condition_to_painless';
import { getReroutePipelineName } from './name';

interface GenerateReroutePipelineParams {
  definition: IngestStreamDefinition;
  directChildren: WiredStreamDefinition[];
}

export function generateReroutePipeline({
  definition,
  directChildren,
}: GenerateReroutePipelineParams) {
  return {
    id: getReroutePipelineName(definition.name),
    processors: definition.ingest.routing
      .filter((child) => {
        // don't put wired virtual streams in the reroute pipeline
        return !directChildren.find((directChild) => directChild.name === child.destination)?.ingest
          .wired.virtual;
      })
      .map((child) => {
        return {
          reroute: {
            destination: child.destination,
            if: conditionToPainless(child.if),
          },
        };
      }),
    _meta: {
      description: `Reoute pipeline for the ${definition.name} stream`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type { PackagePolicy } from '../types/models';

/** Derives unique ES index patterns for an agentless policy's enabled streams, widening to `<type>-<pkg>.*-*` when `dynamic_dataset: true` to cover routing-rule targets. */
export const getAgentlessThroughputIndexPatterns = (
  packagePolicy: Pick<PackagePolicy, 'inputs'>
): string[] =>
  uniq(
    packagePolicy.inputs.flatMap((input) =>
      input.streams
        .filter((stream) => stream.enabled)
        .map((stream) => {
          const type = stream.data_stream.type ?? 'logs';
          const { dataset, elasticsearch } = stream.data_stream;
          if (elasticsearch?.dynamic_dataset) {
            const packageName = dataset.split('.')[0];
            return `${type}-${packageName}.*-*`;
          }
          return `${type}-${dataset}-*`;
        })
    )
  );

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchStreams } from './use_fetch_streams';

export function useDiscoveryStreams() {
  return useFetchStreams({
    select: (result) => {
      return {
        ...result,
        /**
         * Significant events discovery for now only works with logs streams.
         */
        streams: result.streams.filter((stream) => stream.stream.name.startsWith('logs')),
      };
    },
  });
}

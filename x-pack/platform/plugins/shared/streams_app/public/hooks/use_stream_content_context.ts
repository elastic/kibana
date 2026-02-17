/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  detectStreamContext,
  type StreamContextDetectionResult,
} from '../util/stream_context_detection';
import { useKibana } from './use_kibana';

/**
 * Hook that detects the current stream context from the URL.
 * Used to determine which stream's content to show in the content popover.
 *
 * @returns The detected stream context result
 */
export function useStreamContentContext(): StreamContextDetectionResult {
  const location = useLocation();
  const {
    core: {
      http: { basePath },
    },
  } = useKibana();

  return useMemo(
    () =>
      detectStreamContext(
        {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        { prepend: basePath.prepend }
      ),
    [location.pathname, location.search, location.hash, basePath]
  );
}

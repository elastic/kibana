/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/types';
import { useMemo } from 'react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import type { ExecutionContextStart } from '@kbn/core/public';

export const useReactEmbeddableExecutionContext = (
  executionContextStart: ExecutionContextStart,
  parentExecutionContext: KibanaExecutionContext,
  embeddableType: string,
  id: string
) => {
  const embeddableExecutionContext = useMemo(() => {
    const child: KibanaExecutionContext = {
      type: 'visualization',
      name: embeddableType,
      id,
    };

    return {
      ...parentExecutionContext,
      child,
    };
  }, [embeddableType, id, parentExecutionContext]);

  useExecutionContext(executionContextStart, embeddableExecutionContext);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState, useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataFormat } from './aws_service_matrix';

/**
 * Derives the default data format from the active solution.
 *
 * Observability (serverless project type or stateful oblt space) → OTel-native.
 * Everything else → ECS-compatible.
 *
 * `isResolved` is true once the solution is known. On serverless it is synchronous
 * (cloud.serverless.projectType is available immediately). On stateful it becomes
 * true after the active-space fetch completes, or immediately when spaces is absent.
 */
export function useDefaultDataFormat(): { defaultFormat: DataFormat; isResolved: boolean } {
  const { services } = useKibana<{
    cloud?: { serverless?: { projectType?: string } };
    spaces?: {
      getActiveSpace: () => Promise<{ solution?: string }>;
    };
  }>();

  const { cloud, spaces } = services;

  // Serverless: synchronous, always resolved immediately.
  const serverlessProjectType = cloud?.serverless?.projectType;
  const isServerless = serverlessProjectType !== undefined;

  const [spaceSolution, setSpaceSolution] = useState<string | undefined | null>(
    // null = not yet fetched; undefined = spaces absent or fetch complete with no solution
    spaces ? null : undefined
  );

  useEffect(() => {
    if (!spaces) return;
    let cancelled = false;
    spaces.getActiveSpace().then(
      (space) => {
        if (!cancelled) setSpaceSolution(space?.solution ?? undefined);
      },
      () => {
        if (!cancelled) setSpaceSolution(undefined);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [spaces]);

  return useMemo(() => {
    const isResolved = isServerless || spaceSolution !== null;
    const isOblt = serverlessProjectType === 'observability' || spaceSolution === 'oblt';
    return { defaultFormat: isOblt ? 'otel' : 'ecs', isResolved };
  }, [isServerless, serverlessProjectType, spaceSolution]);
}

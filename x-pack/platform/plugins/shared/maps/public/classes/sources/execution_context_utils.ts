/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import { APP_ID } from '../../../common/constants';

export function mergeExecutionContext(
  mergeContext: Partial<KibanaExecutionContext>,
  context: KibanaExecutionContext = {}
): KibanaExecutionContext {
  if (isMapContext(context)) {
    return {
      ...context,
      ...mergeContext,
    };
  }

  if (context.child !== undefined) {
    return {
      ...context,
      child: {
        ...mergeExecutionContext(mergeContext, context.child),
      },
    };
  }

  return context;
}

export function getExecutionContextId(context: KibanaExecutionContext = {}): string | undefined {
  if (isMapContext(context)) {
    return context.id;
  }

  if (context.child !== undefined) {
    return getExecutionContextId(context.child);
  }

  return undefined;
}

function isMapContext(context: KibanaExecutionContext): boolean {
  return context.name === APP_ID;
}

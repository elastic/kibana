/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * True when `pathname` is a route owned by the Agent Builder.
 */
export function isAgentBuilderUiClickRoutePathname(pathname: string): boolean {
  const pathOnly = pathname.split('?')[0] ?? '';
  if (pathOnly === '/' || pathOnly === '') {
    return true;
  }
  return (
    pathOnly.startsWith('/agents/') ||
    pathOnly.startsWith('/manage/') ||
    pathOnly.startsWith('/conversations/')
  );
}

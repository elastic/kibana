/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useApp } from 'ink';
import { useCallback, useMemo } from 'react';
import type { NavigateOptions } from 'react-router-dom-v5-compat';
import { useNavigate } from 'react-router-dom-v5-compat';
import { useActiveRoutes } from './use_active_routes';

interface UseInkRouter {
  back(): void;
  go(pathname: string, options?: NavigateOptions): void;
}

export function useInkRouter(): UseInkRouter {
  const navigate = useNavigate();

  const { exit } = useApp();

  const routes = useActiveRoutes();

  /**
   * Go to a specific route. Use relative routing by default. This usually
   * should not be overridden, with the exception of the code below.
   */
  const go = useCallback(
    (pathname: string, options: NavigateOptions = { relative: 'path' }) => {
      // normalize path names
      const next = pathname.replaceAll(/\/{1,}/g, '/');

      navigate({ pathname: next }, options);
    },
    [navigate]
  );

  // Navigate to the previous active route. Routes can be path-less,
  // so we fold everything into a single string which we then normalize
  // to get the next absolute path
  const back = useCallback(() => {
    const routesWithPaths = routes.filter((route) => !!route.path);

    if (routesWithPaths.length === 0) {
      // we're at the top level, exit right away
      exit();
      return;
    }
    const preceding = routesWithPaths.slice(0, -1);

    const targetPath = preceding.reduce((prev, current) => {
      return current.path ? prev + '/' + current.path.replace(/\*$/, '') : prev;
    }, '');

    go(targetPath || '/', {});
  }, [routes, go, exit]);

  return useMemo(() => {
    return {
      go,
      back,
    };
  }, [go, back]);
}

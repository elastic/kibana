/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useContext, useMemo } from 'react';
import type { Observable } from 'rxjs';
import { BehaviorSubject, map } from 'rxjs';
import type { ActiveRouteObject, RouteHandle } from './types';

interface InkRouteTopLevelContext<
  THandle extends RouteHandle | undefined = RouteHandle | undefined
> {
  active$: Observable<ActiveRouteObject<THandle>[]>;
  register(entry: ActiveRouteObject<THandle>): () => void;
}

const InkRouteContext = createContext<InkRouteTopLevelContext | undefined>(undefined);

function createAPI(): InkRouteTopLevelContext {
  const active$ = new BehaviorSubject<ActiveRouteObject[]>([]);
  return {
    active$: active$.asObservable().pipe(map((value) => value.toReversed())),
    register: (entry) => {
      active$.next(active$.value.concat(entry));
      return () => {
        active$.next(active$.value.filter((item) => item !== entry));
      };
    },
  };
}

/**
 * @internal
 */
export function useInkRouteContext<
  THandle extends RouteHandle | undefined = RouteHandle | undefined
>(): InkRouteTopLevelContext<THandle>;

export function useInkRouteContext(): InkRouteTopLevelContext {
  const ctx = useContext(InkRouteContext);
  if (!ctx) {
    throw new Error('useInkRouteContext must be used within InkRouteContextProvider');
  }
  return ctx;
}

/**
 * @internal
 */
export function InkRouteContextProvider({ children }: { children: React.ReactNode }) {
  const api = useMemo(() => {
    return createAPI();
  }, []);

  return <InkRouteContext.Provider value={api}>{children}</InkRouteContext.Provider>;
}

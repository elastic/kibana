/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useContext } from 'react';
import { type Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

export interface ReloadContextValue {
  refreshTimestamp: number;
}

export const ReloadContext = React.createContext<ReloadContextValue>({
  refreshTimestamp: Date.now(),
});

export const ReloadContextProvider: FC<
  PropsWithChildren<{
    reload$: Observable<number>;
  }>
> = ({ reload$, children }) => {
  const refreshTimestamp = useObservable(reload$, Date.now());
  return <ReloadContext.Provider value={{ refreshTimestamp }}>{children}</ReloadContext.Provider>;
};

export const useReload = () => {
  return useContext(ReloadContext);
};

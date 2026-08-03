import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { type Observable } from 'rxjs';
export interface ReloadContextValue {
    refreshTimestamp: number;
}
export declare const ReloadContext: React.Context<ReloadContextValue>;
export declare const ReloadContextProvider: FC<PropsWithChildren<{
    reload$: Observable<number>;
}>>;
export declare const useReload: () => ReloadContextValue;

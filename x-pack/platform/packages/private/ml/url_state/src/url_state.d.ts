import React, { type FC, type PropsWithChildren } from 'react';
import type { Observable } from 'rxjs';
export interface Dictionary<TValue> {
    [id: string]: TValue;
}
export interface ListingPageUrlState {
    pageSize: number;
    pageIndex: number;
    sortField: string;
    sortDirection: string;
    queryText?: string;
    showPerPageOptions?: boolean;
    showAll?: boolean;
}
export type Accessor = '_a' | '_g';
export type SetUrlState = (accessor: Accessor, attribute: string | Dictionary<any>, value?: any, replaceState?: boolean) => void;
export interface UrlState {
    searchString: string;
    setUrlState: SetUrlState;
}
/**
 * Checks if the URL query parameter requires rison serialization.
 * @param queryParam
 */
export declare function isRisonSerializationRequired(queryParam: string): boolean;
export declare function parseUrlState(search: string): Dictionary<any>;
export declare const urlStateStore: React.Context<UrlState>;
export declare const Provider: React.Provider<UrlState>;
export declare const UrlStateProvider: FC<PropsWithChildren<unknown>>;
export declare const useUrlState: (accessor: Accessor) => [Record<string, any>, (attribute: string | Dictionary<unknown>, value?: unknown, replaceState?: boolean) => void];
/**
 * Service for managing URL state of particular page.
 */
export declare class UrlStateService<T> {
    private _urlState$;
    private _urlStateCallback;
    /**
     * Provides updates for the page URL state.
     */
    getUrlState$(): Observable<T>;
    getUrlState(): T | null;
    updateUrlState(update: Partial<T>, replaceState?: boolean): void;
    /**
     * Populates internal subject with currently active state.
     * @param currentState
     */
    setCurrentState(currentState: T): void;
    /**
     * Sets the callback for the state update.
     * @param callback
     */
    setUpdateCallback(callback: (update: Partial<T>, replaceState?: boolean) => void): void;
}
export interface PageUrlState {
    pageKey: string;
    pageUrlState: object;
}
interface AppStateOptions<T> {
    pageKey: string;
    defaultState?: T;
}
interface GlobalStateOptions<T> {
    defaultState?: T;
}
type UrlStateOptions<K extends Accessor, T> = K extends '_a' ? AppStateOptions<T> : GlobalStateOptions<T>;
export declare const useUrlStateService: <K extends Accessor, T>(stateKey: K, options: UrlStateOptions<K, T>) => [T, (update: Partial<T>, replaceState?: boolean) => void, UrlStateService<T>];
/**
 * Hook for managing the URL state of the page.
 */
export declare const usePageUrlState: <T extends PageUrlState>(pageKey: T["pageKey"], defaultState?: T["pageUrlState"]) => [T["pageUrlState"], (update: Partial<T["pageUrlState"]>, replaceState?: boolean) => void, UrlStateService<T["pageUrlState"]>];
/**
 * Global state type, to add more state types, add them here
 */
export interface GlobalState {
    ml: {
        jobIds: string[];
    };
    time?: {
        from: string;
        to: string;
    };
}
/**
 * Hook for managing the global URL state.
 */
export declare const useGlobalUrlState: (defaultState?: GlobalState) => [GlobalState, (update: Partial<GlobalState>, replaceState?: boolean) => void, UrlStateService<GlobalState>];
export {};

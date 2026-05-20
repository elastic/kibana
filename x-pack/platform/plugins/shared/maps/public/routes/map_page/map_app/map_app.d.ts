import React from 'react';
import type { AppMountParameters, KibanaExecutionContext, ScopedHistory } from '@kbn/core/public';
import type { Adapters } from '@kbn/inspector-plugin/public';
import type { Subscription } from 'rxjs';
import { type Filter, type ProjectRouting, type Query, type TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-plugin/common';
import type { GlobalQueryStateFromUrl, QueryState, QueryStateChange, RefreshInterval, SavedQuery } from '@kbn/data-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { AppStateManager } from '../url_state';
import type { SavedMap } from '../saved_map';
import type { MapAttributes } from '../../../../server';
export interface Props {
    savedMap: SavedMap;
    saveCounter: number;
    onAppLeave: AppMountParameters['onAppLeave'];
    filters: Filter[];
    isFullScreen: boolean;
    isOpenSettingsDisabled: boolean;
    enableFullScreen: () => void;
    openMapSettings: () => void;
    inspectorAdapters: Adapters;
    nextIndexPatternIds: string[];
    setQuery: ({ forceRefresh, filters, query, timeFilters, searchSessionId, projectRouting, }: {
        filters?: Filter[];
        query?: Query;
        timeFilters?: TimeRange;
        forceRefresh?: boolean;
        searchSessionId?: string;
        projectRouting?: ProjectRouting;
    }) => void;
    timeFilters: TimeRange;
    isSaveDisabled: boolean;
    query: Query | undefined;
    setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
    history: ScopedHistory;
    setExecutionContext: (executionContext: KibanaExecutionContext) => void;
}
export interface State {
    initialized: boolean;
    indexPatterns: DataView[];
    savedQuery?: SavedQuery;
    isRefreshPaused: boolean;
    refreshInterval: number;
}
export declare class MapApp extends React.Component<Props, State> {
    _autoRefreshSubscription: Subscription | null;
    _globalSyncUnsubscribe: (() => void) | null;
    _globalSyncChangeMonitorSubscription: Subscription | null;
    _appSyncUnsubscribe: (() => void) | null;
    _projectRoutingUnsubscribe: (() => void) | undefined;
    _appStateManager: AppStateManager;
    _prevIndexPatternIds: string[] | null;
    _isMounted: boolean;
    _kbnUrlStateStorage: IKbnUrlStateStorage;
    _initialTimeFromUrl: TimeRange | undefined;
    constructor(props: Props);
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _updateFromGlobalState: ({ changes, state: globalState, }: {
        changes: QueryStateChange;
        state: QueryState;
    }) => void;
    _getGlobalState(): GlobalQueryStateFromUrl;
    _updateGlobalState(newState: GlobalQueryStateFromUrl): void;
    _updateIndexPatterns(): Promise<void>;
    _onQueryChange: ({ filters, query, time, }: {
        filters?: Filter[];
        query?: Query;
        time?: TimeRange;
    }) => void;
    _getInitialTime(mapState?: MapAttributes): Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }>;
    _initMapAndLayerSettings(mapState?: MapAttributes): void;
    _onFiltersChange: (filters: Filter[]) => void;
    _onRefreshConfigChange(refreshInterval: RefreshInterval): void;
    _updateStateFromSavedQuery: (savedQuery: SavedQuery) => void;
    _initMap(): Promise<void>;
    _renderTopNav(): React.JSX.Element | null;
    _addFilter: (newFilters: Filter[]) => Promise<void>;
    _renderLegacyUrlConflict(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
    render(): React.JSX.Element | null;
}

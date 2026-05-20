import React from 'react';
import type { BoolQuery, Filter } from '@kbn/es-query';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared/src/alert_filter_controls/types';
import type { AlertsSearchBarProps } from './types';
export interface UrlSyncedAlertsSearchBarProps extends Omit<AlertsSearchBarProps, 'query' | 'rangeFrom' | 'rangeTo' | 'filters' | 'onQuerySubmit'> {
    showFilterControls?: boolean;
    urlStorageKey?: string;
    filterControlsStorageKey?: string;
    onEsQueryChange: (esQuery: {
        bool: BoolQuery;
    }) => void;
    onFilterSelected?: (filters: Filter[]) => void;
    defaultFilterControls?: FilterControlConfig[];
}
/**
 * An abstraction over AlertsSearchBar that syncs the query state with the url
 */
export declare const UrlSyncedAlertsSearchBar: ({ ruleTypeIds, showFilterControls, urlStorageKey, filterControlsStorageKey: filterControlsStorageKeyProp, onEsQueryChange, onFilterSelected, defaultFilterControls, ...rest }: UrlSyncedAlertsSearchBarProps) => React.JSX.Element;

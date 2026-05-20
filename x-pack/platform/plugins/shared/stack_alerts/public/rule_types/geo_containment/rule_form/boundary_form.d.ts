import React from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Query } from '@kbn/es-query';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { GeoContainmentAlertParams } from '../types';
export declare const BOUNDARY_GEO_FIELD_TYPES: string[];
interface Props {
    data: DataPublicPluginStart;
    getValidationError: (key: string) => string | null;
    ruleParams: GeoContainmentAlertParams;
    setDataViewId: (id: string) => void;
    setDataViewTitle: (title: string) => void;
    setGeoField: (fieldName: string) => void;
    setNameField: (fieldName: string | undefined) => void;
    setQuery: (query: Query) => void;
    unifiedSearch: UnifiedSearchPublicPluginStart;
}
export declare const BoundaryForm: (props: Props) => React.JSX.Element;
export {};

import React from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { Query } from '@kbn/es-query';
import type { GeoContainmentAlertParams } from '../types';
export declare const ENTITY_GEO_FIELD_TYPES: string[];
interface Props {
    data: DataPublicPluginStart;
    getValidationError: (key: string) => string | null;
    ruleParams: GeoContainmentAlertParams;
    setDataViewId: (id: string) => void;
    setDataViewTitle: (title: string) => void;
    setDateField: (fieldName: string) => void;
    setEntityField: (fieldName: string) => void;
    setGeoField: (fieldName: string) => void;
    setQuery: (query: Query) => void;
    unifiedSearch: UnifiedSearchPublicPluginStart;
}
export declare const EntityForm: (props: Props) => React.JSX.Element;
export {};

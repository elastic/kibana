import React, { Component } from 'react';
import type { GeoShapeRelation, QueryDslFieldLookup } from '@elastic/elasticsearch/lib/api/types';
import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { MultiPolygon, Polygon } from 'geojson';
interface Props {
    onClose: () => void;
    geometry?: MultiPolygon | Polygon;
    addFilters: (filters: Filter[], actionId: string) => Promise<void>;
    getFilterActions?: () => Promise<Action[]>;
    getActionContext?: () => ActionExecutionContext;
    loadPreIndexedShape?: () => Promise<QueryDslFieldLookup | null>;
    geoFieldNames: string[];
}
interface State {
    isLoading: boolean;
    errorMsg: string | undefined;
}
export declare class FeatureGeometryFilterForm extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadPreIndexedShape: () => Promise<QueryDslFieldLookup | null | undefined>;
    _createFilter: ({ geometryLabel, relation, }: {
        geometryLabel: string;
        relation: GeoShapeRelation;
    }) => Promise<void>;
    render(): React.JSX.Element;
}
export {};

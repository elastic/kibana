import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import { SortDirection } from '@kbn/data-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { SCALING_TYPES } from '../../../../common/constants';
import { ESDocField } from '../../fields/es_doc_field';
import type { IESSource } from '../es_source';
import type { OnSourceChangeArgs } from '../source';
import type { IField } from '../../fields/field';
interface Props {
    indexPatternId: string;
    onChange(...args: OnSourceChangeArgs[]): void;
    tooltipFields: ESDocField[];
    sortField: string;
    sortOrder: SortDirection;
    scalingType: SCALING_TYPES;
    source: IESSource;
    hasSpatialJoins: boolean;
    numberOfJoins: number;
    getGeoField(): Promise<DataViewField>;
    filterByMapBounds: boolean;
}
interface State {
    loadError?: string;
    sourceFields: IField[] | null;
    sortFields: DataViewField[] | undefined;
    supportsClustering: boolean;
    clusteringDisabledReason: string | null;
}
export declare class UpdateSourceEditor extends Component<Props, State> {
    _isMounted: boolean;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    loadFields(): Promise<void>;
    _onTooltipPropertiesChange: (propertyNames: string[]) => void;
    _onSortFieldChange: (sortField?: string) => void;
    _onSortOrderChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    _renderTooltipsPanel(): React.JSX.Element;
    _renderSortPanel(): React.JSX.Element;
    _renderScalingPanel(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};

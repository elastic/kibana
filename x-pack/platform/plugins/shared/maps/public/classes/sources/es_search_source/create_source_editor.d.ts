import React, { Component } from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { ESSearchSourceDescriptor } from '../../../../common/descriptor_types';
interface Props {
    onSourceConfigChange: (sourceConfig: Partial<ESSearchSourceDescriptor> | null, isPointsOnly: boolean) => void;
}
interface State {
    indexPattern: DataView | undefined;
    geoFields: DataViewField[] | undefined;
    geoFieldName: string | undefined;
}
export declare class CreateSourceEditor extends Component<Props, State> {
    state: State;
    _onIndexPatternSelect: (indexPattern: DataView) => void;
    _onGeoFieldSelect: (geoFieldName?: string) => void;
    _previewLayer: () => void;
    _renderGeoSelect(): React.JSX.Element | undefined;
    render(): React.JSX.Element;
}
export {};

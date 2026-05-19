import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import _ from 'lodash';
import type { Value } from '@kbn/kibana-react-plugin/public';
import type { MVTFieldDescriptor } from '../../../../common/descriptor_types';
export type MVTSettings = {
    layerName: string;
    fields: MVTFieldDescriptor[];
    minSourceZoom: number;
    maxSourceZoom: number;
};
interface State {
    currentLayerName: string;
    currentMinSourceZoom: number;
    currentMaxSourceZoom: number;
    currentFields: MVTFieldDescriptor[];
    touchedLayerName: boolean;
}
interface Props {
    handleChange: (args: MVTSettings) => void;
    layerName: string;
    fields: MVTFieldDescriptor[];
    minSourceZoom: number;
    maxSourceZoom: number;
    showFields: boolean;
}
export declare class MVTSingleLayerSourceSettings extends Component<Props, State> {
    state: {
        currentLayerName: string;
        currentMinSourceZoom: number;
        currentMaxSourceZoom: number;
        currentFields: Readonly<{} & {
            name: string;
            type: import("../../../../common/constants").MVT_FIELD_TYPE;
        }>[];
        touchedLayerName: boolean;
    };
    _handleChange: _.DebouncedFunc<() => void>;
    _handleLayerNameInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    _handleLayerNameInputBlur: () => void;
    _handleFieldChange: (fields: MVTFieldDescriptor[]) => void;
    _handleZoomRangeChange: (e: Value) => void;
    render(): React.JSX.Element;
}
export {};

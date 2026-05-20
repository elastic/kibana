import React, { Component } from 'react';
import type { MVTField } from '../../fields/mvt_field';
import type { MVTSingleLayerVectorSource } from './mvt_single_layer_vector_source';
import type { MVTSettings } from './mvt_single_layer_source_settings';
import type { OnSourceChangeArgs } from '../source';
import type { MVTFieldDescriptor } from '../../../../common/descriptor_types';
interface Props {
    tooltipFields: MVTField[];
    onChange: (...args: OnSourceChangeArgs[]) => void;
    source: MVTSingleLayerVectorSource;
}
interface State {
}
export declare class UpdateSourceEditor extends Component<Props, State> {
    _onTooltipPropertiesSelect: (propertyNames: string[]) => void;
    _handleChange: (settings: MVTSettings) => void;
    _getFieldDescriptors(): MVTFieldDescriptor[];
    _renderSourceSettingsCard(): React.JSX.Element;
    _renderTooltipSelectionCard(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};

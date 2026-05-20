import React, { Component } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { MlAnomalyLayersType } from './util';
interface Props {
    onChange: (typicalActual: MlAnomalyLayersType) => void;
    typicalActual: MlAnomalyLayersType;
}
interface State {
}
export declare class LayerSelector extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    onSelect: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
    render(): React.JSX.Element;
}
export {};

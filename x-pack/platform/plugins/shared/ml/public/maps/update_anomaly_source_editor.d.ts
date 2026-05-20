import React, { Component } from 'react';
import type { MlAnomalyLayersType } from './util';
interface Props {
    onChange: (...args: Array<{
        propName: string;
        value: unknown;
    }>) => void;
    typicalActual: MlAnomalyLayersType;
}
interface State {
}
export declare class UpdateAnomalySourceEditor extends Component<Props, State> {
    state: State;
    render(): React.JSX.Element;
}
export {};

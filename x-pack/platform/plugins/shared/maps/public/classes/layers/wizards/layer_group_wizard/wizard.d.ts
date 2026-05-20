import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { RenderWizardArguments } from '../layer_wizard_registry';
interface State {
    label: string;
}
export declare class LayerGroupWizard extends Component<RenderWizardArguments, State> {
    state: State;
    componentDidMount(): void;
    _onLabelChange: (e: ChangeEvent<HTMLInputElement>) => void;
    _previewLayer(): void;
    render(): React.JSX.Element;
}
export {};

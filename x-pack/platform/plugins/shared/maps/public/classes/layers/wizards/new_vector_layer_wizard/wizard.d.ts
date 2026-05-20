import React, { Component } from 'react';
import type { RenderWizardArguments } from '../layer_wizard_registry';
interface State {
    indexName: string;
    indexNameError: string;
    indexingTriggered: boolean;
    createIndexError: string;
    userHasIndexWritePermissions: boolean;
}
export declare class NewVectorLayerEditor extends Component<RenderWizardArguments, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): Promise<void>;
    _setCreateIndexError(errorMessage: string, userHasIndexWritePermissions?: boolean): void;
    _checkIndexPermissions(): Promise<boolean>;
    _createNewIndex: () => Promise<void>;
    _onIndexChange: (indexName: string, indexError?: string) => void;
    render(): React.JSX.Element;
}
export {};

import React, { Component } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
interface Props {
    isColumnCompressed?: boolean;
    onChange: (emsFileId: string) => void;
    value: string | null;
    fullWidth?: boolean;
}
interface State {
    hasLoadedOptions: boolean;
    emsFileOptions: Array<EuiComboBoxOptionOption<string>>;
}
export declare class EMSFileSelect extends Component<Props, State> {
    private _isMounted;
    state: {
        hasLoadedOptions: boolean;
        emsFileOptions: never[];
    };
    _loadFileOptions: () => Promise<void>;
    componentWillUnmount(): void;
    componentDidMount(): void;
    _onChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
    _renderSelect(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};

import React, { Component } from 'react';
import type { EMSFileSourceDescriptor } from '../../../../common/descriptor_types';
interface Props {
    onSourceConfigChange: (sourceConfig: Partial<EMSFileSourceDescriptor>) => void;
}
interface State {
    emsFileId: string | null;
}
export declare class EMSFileCreateSourceEditor extends Component<Props, State> {
    state: {
        emsFileId: null;
    };
    _onChange: (emsFileId: string) => void;
    render(): React.JSX.Element;
}
export {};

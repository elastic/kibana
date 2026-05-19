import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import _ from 'lodash';
export type XYZTMSSourceConfig = {
    urlTemplate: string;
};
interface Props {
    onSourceConfigChange: (sourceConfig: XYZTMSSourceConfig | null) => void;
}
interface State {
    url: string;
}
export declare class XYZTMSEditor extends Component<Props, State> {
    state: {
        url: string;
    };
    _previewLayer: _.DebouncedFunc<() => void>;
    _onUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
    render(): React.JSX.Element;
}
export {};

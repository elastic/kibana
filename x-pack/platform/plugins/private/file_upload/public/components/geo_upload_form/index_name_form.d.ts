import _ from 'lodash';
import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
export interface Props {
    indexName: string;
    indexNameError?: string;
    onIndexNameChange: (name: string, error?: string) => void;
    onIndexNameValidationStart: () => void;
    onIndexNameValidationEnd: () => void;
}
export declare class IndexNameForm extends Component<Props> {
    private _isMounted;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _onIndexNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
    _validateIndexName: _.DebouncedFunc<(indexName: string) => Promise<void>>;
    render(): React.JSX.Element;
}

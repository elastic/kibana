import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import type { IndexPatternMeta } from './security_index_pattern_utils';
interface Props {
    value: string;
    onChange: (indexPatternMeta: IndexPatternMeta | null) => void;
}
interface State {
    hasLoaded: boolean;
    options: EuiSelectOption[];
}
export declare class IndexPatternSelect extends Component<Props, State> {
    private _isMounted;
    state: {
        hasLoaded: boolean;
        options: never[];
    };
    componentWillUnmount(): void;
    componentDidMount(): void;
    _loadOptions(): Promise<void>;
    _onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    render(): React.JSX.Element | null;
}
export {};

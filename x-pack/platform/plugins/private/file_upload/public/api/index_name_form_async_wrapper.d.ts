import React from 'react';
import type { IndexNameFormProps } from '..';
interface State {
    IndexNameForm: React.ComponentType<IndexNameFormProps> | null;
}
export declare class IndexNameFormAsyncWrapper extends React.Component<IndexNameFormProps, State> {
    state: State;
    private _isMounted;
    componentWillUnmount(): void;
    componentDidMount(): void;
    render(): React.JSX.Element;
}
export {};

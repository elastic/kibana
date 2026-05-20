import React, { Component } from 'react';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
interface Props {
    value?: string;
    onChange: (value: string) => void;
    getFilterActions?: () => Promise<Action[]>;
    getActionContext?: () => ActionExecutionContext;
}
interface State {
    actions: Action[];
}
export declare class ActionSelect extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadActions(): Promise<void>;
    render(): React.JSX.Element | null;
}
export {};

import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
interface Props {
    className?: string;
    buttonLabel: string;
    getFilterActions?: () => Promise<Action[]>;
    getActionContext?: () => ActionExecutionContext;
    onSubmit: ({ actionId, filterLabel }: {
        actionId: string;
        filterLabel: string;
    }) => void;
}
interface State {
    actionId: string;
    filterLabel: string;
}
export declare class DistanceFilterForm extends Component<Props, State> {
    state: State;
    _onFilterLabelChange: (e: ChangeEvent<HTMLInputElement>) => void;
    _onActionIdChange: (value: string) => void;
    _onSubmit: () => void;
    render(): React.JSX.Element;
}
export {};

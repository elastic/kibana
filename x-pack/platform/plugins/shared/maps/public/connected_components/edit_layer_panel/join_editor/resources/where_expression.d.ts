import React, { Component } from 'react';
import type { DataView, Query } from '@kbn/data-plugin/common';
interface Props {
    indexPattern: DataView;
    onChange: (whereQuery?: Query) => void;
    whereQuery?: Query;
}
interface State {
    isPopoverOpen: boolean;
}
export declare class WhereExpression extends Component<Props, State> {
    state: State;
    _togglePopover: () => void;
    _closePopover: () => void;
    _onQueryChange: ({ query }: {
        query?: Query;
    }) => void;
    render(): React.JSX.Element;
}
export {};

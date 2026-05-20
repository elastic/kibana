import React, { Component } from 'react';
interface State {
    isPopoverOpen: boolean;
}
export declare class QueryThresholdHelpPopover extends Component<{}, State> {
    state: State;
    PopoverStyles: import("@emotion/react").SerializedStyles;
    _togglePopover: () => void;
    _closePopover: () => void;
    _renderContent(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};

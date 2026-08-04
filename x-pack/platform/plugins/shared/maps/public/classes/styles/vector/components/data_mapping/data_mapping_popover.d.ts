import type { ReactElement } from 'react';
import React, { Component } from 'react';
type Props = {
    children: ReactElement<any>;
};
type State = {
    isPopoverOpen: boolean;
};
export declare class DataMappingPopover extends Component<Props, State> {
    state: {
        isPopoverOpen: boolean;
    };
    _togglePopover: () => void;
    _closePopover: () => void;
    _renderButton(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};

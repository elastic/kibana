import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { Attribution } from '../../../../common/descriptor_types';
interface Props {
    onChange: (attribution: Attribution) => void;
    popoverButtonLabel: string;
    popoverButtonAriaLabel: string;
    popoverButtonIcon: string;
    popoverButtonClassName?: string;
    label: string;
    url: string;
}
interface State {
    isPopoverOpen: boolean;
    label: string;
    url: string;
}
export declare class AttributionPopover extends Component<Props, State> {
    state: State;
    _togglePopover: () => void;
    _closePopover: () => void;
    _onApply: () => void;
    _onLabelChange: (event: ChangeEvent<HTMLInputElement>) => void;
    _onUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
    _renderPopoverButton(): React.JSX.Element;
    _renderContent(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};

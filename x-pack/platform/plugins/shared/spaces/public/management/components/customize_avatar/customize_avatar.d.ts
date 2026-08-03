import React, { Component } from 'react';
import type { SpaceValidator } from '../../lib';
import type { CustomizeSpaceFormValues } from '../../types';
interface Props {
    validator: SpaceValidator;
    space: CustomizeSpaceFormValues;
    onChange: (space: CustomizeSpaceFormValues) => void;
    title?: string;
}
interface State {
    customizingAvatar: boolean;
    usingCustomIdentifier: boolean;
}
export declare class CustomizeAvatar extends Component<Props, State> {
    state: {
        customizingAvatar: boolean;
        usingCustomIdentifier: boolean;
    };
    render(): React.JSX.Element;
    onAvatarChange: (space: CustomizeSpaceFormValues) => void;
}
export {};

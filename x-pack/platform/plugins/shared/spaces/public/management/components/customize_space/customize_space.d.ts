import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { SpaceValidator } from '../../lib';
import type { CustomizeSpaceFormValues } from '../../types';
interface Props {
    validator: SpaceValidator;
    space: CustomizeSpaceFormValues;
    editingExistingSpace: boolean;
    onChange: (space: CustomizeSpaceFormValues) => void;
    title?: string;
}
interface State {
    customizingAvatar: boolean;
    usingCustomIdentifier: boolean;
}
export declare class CustomizeSpace extends Component<Props, State> {
    state: {
        customizingAvatar: boolean;
        usingCustomIdentifier: boolean;
    };
    render(): React.JSX.Element;
    onNameChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onDescriptionChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    onSpaceIdentifierChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onAvatarChange: (space: CustomizeSpaceFormValues) => void;
}
export {};

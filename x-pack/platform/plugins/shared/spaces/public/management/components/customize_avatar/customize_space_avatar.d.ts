import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { SpaceValidator } from '../../lib';
import type { CustomizeSpaceFormValues } from '../../types';
interface Props {
    space: CustomizeSpaceFormValues;
    onChange: (space: CustomizeSpaceFormValues) => void;
    validator: SpaceValidator;
}
export declare class CustomizeSpaceAvatar extends Component<Props> {
    private storeImageChanges;
    private handleImageUpload;
    private onFileUpload;
    render(): React.JSX.Element;
    onInitialsChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onColorChange: (color: string) => void;
}
export {};

import React, { Component } from 'react';
import type { CustomIcon } from '../../../../../../common/descriptor_types';
interface Props {
    /**
     * initial value for the id of image added to map
     */
    symbolId?: string;
    /**
     * initial value of the label of the custom element
     */
    label?: string;
    /**
     * initial value of the preview image of the custom element as a base64 dataurl
     */
    svg?: string;
    /**
     * intial value of alpha threshold for signed-distance field
     */
    cutoff: number;
    /**
     * intial value of radius for signed-distance field
     */
    radius: number;
    /**
     * title of the modal
     */
    title: string;
    /**
     * A click handler for the save button
     */
    onSave: (icon: CustomIcon) => void;
    /**
     * A click handler for the cancel button
     */
    onCancel: () => void;
    /**
     * A click handler for the delete button
     */
    onDelete?: (symbolId: string) => void;
}
interface State {
    /**
     * label of the custom element to be saved
     */
    label: string;
    /**
     * image of the custom element to be saved
     */
    svg: string;
    cutoff: number;
    radius: number;
    isFileInvalid: boolean;
}
export declare class CustomIconModal extends Component<Props, State> {
    private _isMounted;
    state: {
        label: string;
        svg: string;
        cutoff: number;
        radius: number;
        isFileInvalid: boolean;
    };
    componentWillUnmount(): void;
    componentDidMount(): void;
    private _handleLabelChange;
    private _handleCutoffChange;
    private _handleRadiusChange;
    private _resetAdvancedOptions;
    private _onFileSelect;
    private _renderAdvancedOptions;
    private _renderIconForm;
    private _renderIconPreview;
    render(): React.JSX.Element;
}
export {};

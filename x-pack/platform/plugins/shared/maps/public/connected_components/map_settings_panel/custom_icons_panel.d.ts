import React, { Component } from 'react';
import type { CustomIcon } from '../../../common/descriptor_types';
interface Props {
    customIcons: CustomIcon[];
    updateCustomIcons: (customIcons: CustomIcon[]) => void;
    deleteCustomIcon: (symbolId: string) => void;
}
interface State {
    isModalVisible: boolean;
    selectedIcon?: CustomIcon;
}
export declare class CustomIconsPanel extends Component<Props, State> {
    state: {
        isModalVisible: boolean;
        selectedIcon: undefined;
    };
    private _handleIconEdit;
    private _handleNewIcon;
    private _renderModal;
    private _hideModal;
    private _handleSave;
    private _handleDelete;
    private _renderCustomIconsList;
    render(): React.JSX.Element;
}
export {};

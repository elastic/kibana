export class IconSelect extends React.Component<any, any, any> {
    constructor(props: any);
    constructor(props: any, context: any);
    state: {
        isPopoverOpen: boolean;
        isModalVisible: boolean;
    };
    _handleSave: ({ symbolId, svg, cutoff, radius, label }: {
        symbolId: any;
        svg: any;
        cutoff: any;
        radius: any;
        label: any;
    }) => void;
    _closePopover: () => void;
    _hideModal: () => void;
    _openPopover: () => void;
    _showModal: () => void;
    _toggleModal: () => void;
    _togglePopover: () => void;
    _handleKeyboardActivity: (e: any) => void;
    _onIconSelect: (options: any) => void;
    _renderPopoverButton(): React.JSX.Element;
    _renderIconSelectable(): React.JSX.Element;
    render(): React.JSX.Element;
}
import React from 'react';

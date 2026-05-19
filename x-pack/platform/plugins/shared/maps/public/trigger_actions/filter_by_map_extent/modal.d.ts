import React, { Component } from 'react';
interface Props {
    onClose: () => void;
    title: string;
}
export declare class FilterByMapExtentModal extends Component<Props> {
    _renderSwitches(): React.JSX.Element[];
    render(): React.JSX.Element;
}
export {};

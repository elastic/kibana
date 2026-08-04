import React, { Component } from 'react';
export declare function getFileNameWithoutExt(fileName: string): string;
interface Props {
    ext: '.dbf' | '.prj' | '.shx';
    onSelect: (file: File | null) => void;
    shapefileName: string;
}
interface State {
    error: string;
    isInvalid: boolean;
}
export declare class SideCarFilePicker extends Component<Props, State> {
    state: State;
    _isSideCarFileValid(sideCarFile: File): boolean;
    _getSideCarFileNameError(): string;
    _onSelect: (files: FileList | null) => void;
    render(): React.JSX.Element;
}
export {};

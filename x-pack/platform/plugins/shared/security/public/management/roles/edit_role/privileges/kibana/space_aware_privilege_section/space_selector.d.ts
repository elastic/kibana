import React, { Component } from 'react';
import type { DisplaySpace } from '../display_space';
interface Props {
    spaces: DisplaySpace[];
    selectedSpaceIds: string[];
    onChange: (spaceIds: string[]) => void;
    disabled?: boolean;
}
export declare class SpaceSelector extends Component<Props, {}> {
    render(): React.JSX.Element;
    private onChange;
    private getOptions;
    private getSelectedOptions;
}
export {};

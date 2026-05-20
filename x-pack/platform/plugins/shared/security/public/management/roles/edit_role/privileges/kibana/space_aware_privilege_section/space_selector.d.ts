import React, { Component } from 'react';
import type { Space } from '@kbn/spaces-plugin/public';
interface Props {
    spaces: Space[];
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

import React, { Component } from 'react';
import type { Space } from '../../../common';
interface Props {
    spaces: Space[];
    serverBasePath: string;
}
export declare class SpaceCards extends Component<Props, {}> {
    render(): React.JSX.Element;
    private renderSpace;
}
export {};

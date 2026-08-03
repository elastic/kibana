import React, { Component } from 'react';
import type { Space } from '../../../common';
interface Props {
    spaces: Space[];
    serverBasePath: string;
    loading?: boolean;
}
interface State {
    pageIndex: number;
    pageSize: number;
    sortField?: keyof Space;
    sortDirection?: 'asc' | 'desc';
}
export declare class SpaceTable extends Component<Props, State> {
    constructor(props: Props);
    private onTableChange;
    private renderSpaceAvatar;
    private renderSpaceName;
    private renderSpaceDescription;
    private renderSpaceSolution;
    render(): React.JSX.Element;
}
export {};

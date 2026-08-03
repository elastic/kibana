import type { ReactNode } from 'react';
import React, { Component } from 'react';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { type ILayer } from '../../../../../../classes/layers/layer';
interface Footnote {
    icon: ReactNode;
    message?: string | null;
}
export interface ReduxStateProps {
    inspectorAdapters: Adapters;
    isUsingSearch: boolean;
    zoom: number;
}
export interface OwnProps {
    displayName: string;
    escapedDisplayName: string;
    layer: ILayer;
    onClick: () => void;
}
type Props = ReduxStateProps & OwnProps;
interface State {
    isFilteredByGlobalTime: boolean;
}
export declare class TOCEntryButton extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _loadIsFilteredByGlobalTime(): Promise<void>;
    getIconAndTooltipContent(): {
        icon?: ReactNode;
        tooltipContent?: ReactNode;
        footnotes: Footnote[];
        postScript?: string;
    };
    render(): React.JSX.Element;
}
export {};

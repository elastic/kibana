import React, { Component } from 'react';
import type { RangeFieldMeta } from '../../../../../../../common/descriptor_types';
import type { DynamicSizeProperty } from '../../../properties/dynamic_size_property';
interface Props {
    style: DynamicSizeProperty;
}
interface State {
    label: string;
    maxLabelWidth: number;
    fieldMeta: RangeFieldMeta | null;
}
export declare class MarkerSizeLegend extends Component<Props, State> {
    private _isMounted;
    static getDerivedStateFromProps(nextProps: Props, prevState: State): {
        maxLabelWidth: number;
        fieldMeta: RangeFieldMeta | null;
    } | null;
    constructor(props: Props);
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _loadLabel(): Promise<void>;
    _formatValue(value: string | number): string | number;
    _onRightAlignedWidthChange: (width: number) => void;
    _renderMarkers(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};

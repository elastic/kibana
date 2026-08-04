import React from 'react';
import type { Adapters, InspectorViewProps } from '@kbn/inspector-plugin/public';
export declare const VectorTileInspectorView: {
    title: string;
    order: number;
    help: string;
    shouldShow(adapters: Adapters): boolean;
    component: (props: InspectorViewProps) => React.JSX.Element;
};

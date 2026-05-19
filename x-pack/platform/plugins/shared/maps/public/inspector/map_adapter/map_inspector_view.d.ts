import React from 'react';
import type { Adapters } from '@kbn/inspector-plugin/public';
export declare const MapInspectorView: {
    title: string;
    order: number;
    help: string;
    shouldShow(adapters: Adapters): boolean;
    component: (props: {
        adapters: Adapters;
    }) => React.JSX.Element;
};

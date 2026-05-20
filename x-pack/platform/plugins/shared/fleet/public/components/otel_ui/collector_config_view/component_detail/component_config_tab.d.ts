import React from 'react';
import type { OTelComponentType } from '../graph_view/constants';
interface ComponentConfigTabProps {
    componentId: string;
    componentConfig: unknown;
    componentType: OTelComponentType;
}
export declare const ComponentConfigTab: React.FunctionComponent<ComponentConfigTabProps>;
export {};

import React from 'react';
import type { OTelComponentType } from '../constants';
interface ComponentMetricsTabProps {
    componentId: string;
    componentType: OTelComponentType;
}
export declare const SUPPORTED_METRIC_TYPES: OTelComponentType[];
export declare const ComponentMetricsTab: React.FunctionComponent<ComponentMetricsTabProps>;
export {};

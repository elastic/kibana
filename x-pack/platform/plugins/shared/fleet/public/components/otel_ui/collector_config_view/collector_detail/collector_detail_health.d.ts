import React from 'react';
import type { ComponentHealth, OTelCollectorConfig } from '../../../../../common/types';
import type { OTelComponentType } from '../constants';
interface CollectorDetailHealthProps {
    health?: ComponentHealth;
    config?: OTelCollectorConfig;
    onComponentClick?: (componentId: string, componentType: OTelComponentType, pipelineId?: string) => void;
    selectedComponentId?: string;
}
export declare const CollectorDetailHealth: React.FC<CollectorDetailHealthProps>;
export {};

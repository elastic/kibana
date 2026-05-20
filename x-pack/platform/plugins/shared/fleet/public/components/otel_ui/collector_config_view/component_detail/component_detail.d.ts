import React from 'react';
import type { OTelCollectorConfig, ComponentHealth } from '../../../../../common/types';
import type { OTelComponentType } from '../constants';
interface OTelComponentDetailProps {
    componentId: string;
    componentType: OTelComponentType;
    pipelineId?: string;
    config: OTelCollectorConfig;
    health?: ComponentHealth;
    onClose: () => void;
}
export declare const OTelComponentDetail: React.FunctionComponent<OTelComponentDetailProps>;
export {};

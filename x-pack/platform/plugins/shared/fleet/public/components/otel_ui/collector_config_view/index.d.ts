import React from 'react';
import type { OTelCollectorConfig, ComponentHealth } from '../../../../common/types';
interface CollectorConfigViewProps {
    config: OTelCollectorConfig;
    health?: ComponentHealth;
}
export declare const CollectorConfigView: React.FunctionComponent<CollectorConfigViewProps>;
export {};

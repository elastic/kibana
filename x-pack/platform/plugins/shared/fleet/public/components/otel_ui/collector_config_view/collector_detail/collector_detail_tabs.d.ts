import React from 'react';
import type { Agent, ComponentHealth, OTelCollectorConfig } from '../../../../../common/types';
interface CollectorDetailTabsProps {
    agent: Agent;
    config: OTelCollectorConfig;
    health?: ComponentHealth;
    isConfigLoading?: boolean;
}
export declare const CollectorDetailTabs: React.FC<CollectorDetailTabsProps>;
export {};

import React from 'react';
import type { Agent, OTelCollectorConfig } from '../../../../../common/types';
interface CollectorDetailInfoProps {
    agent: Agent;
    config?: OTelCollectorConfig;
}
export declare const CollectorDetailInfo: React.FC<CollectorDetailInfoProps>;
export {};

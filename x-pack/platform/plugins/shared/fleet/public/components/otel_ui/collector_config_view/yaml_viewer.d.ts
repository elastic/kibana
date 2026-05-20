import React from 'react';
import type { OTelCollectorConfig } from '../../../../common/types';
interface YamlViewerProps {
    config: OTelCollectorConfig;
    agentName?: string;
}
export declare const YamlViewer: React.FunctionComponent<YamlViewerProps>;
export {};

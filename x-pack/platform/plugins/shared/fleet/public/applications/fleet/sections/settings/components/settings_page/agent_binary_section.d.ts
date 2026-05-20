import React from 'react';
import type { DownloadSource } from '../../../../types';
export interface AgentBinarySectionProps {
    downloadSources: DownloadSource[];
    deleteDownloadSource: (ds: DownloadSource) => void;
}
export declare const AgentBinarySection: React.FunctionComponent<AgentBinarySectionProps>;

import type { SearchHit } from '@kbn/es-types';
import type { IncomingDataList } from '../../../common/types/rest_spec/agent';
export interface InstalledIntegrationPolicy {
    name: string;
    version: string;
}
export declare const useGetAgentIncomingData: (incomingData: IncomingDataList[], installedPolicy?: InstalledIntegrationPolicy) => {
    enrolledAgents: number;
    numAgentsWithData: number;
    linkButton: {
        href: string;
        text: string;
    };
    message: string;
};
export declare const POLLING_TIMEOUT_MS: number;
/**
 * Hook for polling incoming data for the selected agent(s).
 * @param agentIds
 * @returns incomingData, isLoading
 */
export declare const usePollingIncomingData: ({ agentIds, pkgName, pkgVersion, previewData, stopPollingAfterPreviewLength, }: {
    agentIds: string[];
    pkgName?: string;
    pkgVersion?: string;
    previewData?: boolean;
    stopPollingAfterPreviewLength?: number;
}) => {
    isLoading: boolean;
    hasReachedTimeout: boolean;
    incomingData: IncomingDataList[];
    dataPreview: SearchHit[];
};

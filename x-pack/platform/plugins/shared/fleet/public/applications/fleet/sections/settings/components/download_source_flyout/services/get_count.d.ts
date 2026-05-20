import type { DownloadSource } from '../../../../../types';
export declare function getCountsForDownloadSource(downloadSource: DownloadSource): Promise<{
    agentPolicyCount: number;
    agentCount: number;
}>;

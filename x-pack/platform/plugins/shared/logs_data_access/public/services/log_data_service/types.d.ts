export type LogDataStatus = 'available' | 'empty' | 'missing' | 'unknown';
export interface LogDataService {
    getStatus(opts?: {
        excludeIndices?: string[];
    }): Promise<{
        status: LogDataStatus;
        hasData: boolean;
    }>;
}

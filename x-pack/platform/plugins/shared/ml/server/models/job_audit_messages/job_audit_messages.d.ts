import type { IScopedClusterClient } from '@kbn/core/server';
import type { JobMessage } from '@kbn/ml-common-types/audit_message';
import type { AuditMessage } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { MLSavedObjectService } from '../../saved_objects';
import type { MlClient } from '../../lib/ml_client';
export declare function isClearable(index?: string): boolean;
export type JobsErrorsResponse = Array<{
    job_id: string;
    errors: JobMessage[];
}>;
export type JobAuditMessagesService = ReturnType<typeof jobAuditMessagesProvider>;
export declare function jobAuditMessagesProvider({ asInternalUser }: IScopedClusterClient, mlClient: MlClient): {
    getJobAuditMessages: (mlSavedObjectService: MLSavedObjectService, { jobId, from, start, end, }: {
        jobId?: string;
        from?: string;
        start?: string;
        end?: string;
    }) => Promise<{
        messages: JobMessage[];
        notificationIndices: string[];
    }>;
    getAuditMessagesSummary: (jobIds: string[]) => Promise<AuditMessage[]>;
    clearJobAuditMessages: (jobId: string, notificationIndices: string[]) => Promise<{
        success: boolean;
        last_cleared: number;
    }>;
    getJobsErrorMessages: (jobIds: string[], earliestMs?: number) => Promise<JobsErrorsResponse>;
};

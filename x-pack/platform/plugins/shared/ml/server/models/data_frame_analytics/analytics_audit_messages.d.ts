import type { IScopedClusterClient } from '@kbn/core/server';
import type { JobMessage } from '@kbn/ml-common-types/audit_message';
export declare function analyticsAuditMessagesProvider({ asInternalUser }: IScopedClusterClient): {
    getAnalyticsAuditMessages: (analyticsId: string) => Promise<JobMessage[]>;
};

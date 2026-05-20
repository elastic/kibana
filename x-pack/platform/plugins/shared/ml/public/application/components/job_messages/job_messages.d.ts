import type { FC } from 'react';
import type { JobMessage } from '@kbn/ml-common-types/audit_message';
interface JobMessagesProps {
    messages: JobMessage[];
    loading: boolean;
    error: string;
    refreshMessage?: () => Promise<void>;
    actionHandler?: (message: JobMessage) => void;
}
/**
 * Component for rendering job messages for anomaly detection
 * and data frame analytics jobs.
 */
export declare const JobMessages: FC<JobMessagesProps>;
export {};

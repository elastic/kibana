import type { FC } from 'react';
import type { JobMessage } from '@kbn/ml-common-types/audit_message';
interface JobMessagesPaneProps {
    jobId: string;
    showClearButton?: boolean;
    start?: string;
    end?: string;
    actionHandler?: (message: JobMessage) => void;
    refreshJobList?: () => void;
}
export declare const JobMessagesPane: FC<JobMessagesPaneProps>;
export {};

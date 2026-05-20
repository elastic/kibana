import type { FC } from 'react';
interface JobSelectorBadgeProps {
    icon?: boolean;
    id: string;
    isGroup?: boolean;
    numJobs?: number;
    removeId?: Function;
}
export declare const JobSelectorBadge: FC<JobSelectorBadgeProps>;
export {};

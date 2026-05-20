import type { FC } from 'react';
import type { AnalyticsProgressStats } from './create_step_footer';
interface Props {
    currentProgress?: AnalyticsProgressStats;
    failedJobMessage: string | undefined;
}
export declare const ProgressStats: FC<Props>;
export {};

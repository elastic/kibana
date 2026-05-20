import type { FC } from 'react';
import type { ScheduledReportApiJSON } from '@kbn/reporting-common/types';
interface ReportScheduleIndicatorProps {
    schedule: ScheduledReportApiJSON['schedule'];
}
export declare const ReportScheduleIndicator: FC<ReportScheduleIndicatorProps>;
export {};

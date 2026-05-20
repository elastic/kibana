import type { FunctionComponent } from 'react';
import type { ClientConfigType, Job } from '@kbn/reporting-public';
interface Props {
    info: Job;
    config: ClientConfigType;
}
export declare const ReportInfoFlyoutContent: FunctionComponent<Props>;
export {};

import type { FunctionComponent } from 'react';
import type { ClientConfigType, Job } from '@kbn/reporting-public';
interface Props {
    config: ClientConfigType;
    onClose: () => void;
    job: Job;
}
export declare const ReportInfoFlyout: FunctionComponent<Props>;
export {};

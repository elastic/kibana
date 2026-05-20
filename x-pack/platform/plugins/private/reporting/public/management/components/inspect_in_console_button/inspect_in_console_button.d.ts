import React from 'react';
import type { ClientConfigType, Job } from '@kbn/reporting-public';
interface Props {
    job: Job;
    config: ClientConfigType;
}
export declare const InspectInConsoleButton: React.FC<Props>;
export {};

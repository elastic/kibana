import type { FC, PropsWithChildren } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { LayerResult } from '../../../application/jobs/new_job/job_from_lens';
import type { CreateState } from '../../../application/jobs/new_job/job_from_dashboard';
export interface CreateADJobParams {
    jobId: string;
    bucketSpan: string;
    startJob: boolean;
    runInRealTime: boolean;
}
interface Props {
    createADJobInWizard: () => void;
    createADJob: (args: CreateADJobParams) => Promise<CreateState>;
    layer?: LayerResult;
    layerIndex: number;
    timeRange: TimeRange | undefined;
    incomingCreateError?: {
        text: string;
        errorText: string;
    };
    outerFormComplete?: boolean;
}
export declare const JobDetails: FC<PropsWithChildren<Props>>;
export {};

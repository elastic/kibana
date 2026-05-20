import type { FC } from 'react';
import type { MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
interface AnomalyKqlFilterProps {
    value: string | null | undefined;
    onChange: (filter: string | null) => void;
    jobConfigs: CombinedJobWithStats[];
    resultType: MlAnomalyResultType;
    jobId?: string;
    errors?: string[];
    disabled?: boolean;
}
export declare const AnomalyKqlFilter: FC<AnomalyKqlFilterProps>;
export {};

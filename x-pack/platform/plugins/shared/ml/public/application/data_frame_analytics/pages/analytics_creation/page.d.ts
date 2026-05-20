import type { FC } from 'react';
import type { DataFrameAnalyticsId } from '@kbn/ml-data-frame-analytics-utils';
export declare enum ANALYTICS_STEPS {
    CONFIGURATION = 0,
    ADVANCED = 1,
    DETAILS = 2,
    VALIDATION = 3,
    CREATE = 4
}
interface Props {
    jobId?: DataFrameAnalyticsId;
}
export declare const Page: FC<Props>;
export {};

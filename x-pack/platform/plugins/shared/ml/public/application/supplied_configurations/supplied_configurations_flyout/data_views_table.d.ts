import type { FC } from 'react';
import type { RecognizeModuleResult } from '@kbn/ml-common-types/modules';
interface Props {
    matchingDataViews: RecognizeModuleResult;
    moduleId: string;
    jobsLength: number;
}
export declare const DataViewsTable: FC<Props>;
export {};

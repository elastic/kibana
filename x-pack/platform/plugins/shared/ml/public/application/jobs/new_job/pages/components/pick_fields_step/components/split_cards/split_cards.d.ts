import type { FC, PropsWithChildren } from 'react';
import type { SplitField } from '@kbn/ml-anomaly-utils';
import type { JOB_TYPE } from '../../../../../../../../../common/constants/new_job';
interface Props {
    fieldValues: string[];
    splitField: SplitField;
    numberOfDetectors: number;
    jobType: JOB_TYPE;
    animate?: boolean;
}
export declare const SplitCards: FC<PropsWithChildren<Props>>;
export {};

import type { FC } from 'react';
import { REGRESSION_STATS } from '../../../../common/analytics';
interface Props {
    isLoading: boolean;
    title: number | string;
    statType: REGRESSION_STATS;
    dataTestSubj: string;
}
export declare const EvaluateStat: FC<Props>;
export {};

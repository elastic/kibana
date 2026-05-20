import type { FC } from 'react';
import { type MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
export interface ResultTypeSelectorProps {
    value: MlAnomalyResultType | undefined;
    availableOption: MlAnomalyResultType[];
    onChange: (value: MlAnomalyResultType) => void;
}
export declare const ResultTypeSelector: FC<ResultTypeSelectorProps>;

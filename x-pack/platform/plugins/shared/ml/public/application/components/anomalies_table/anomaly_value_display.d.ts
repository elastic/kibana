import type { MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils/types';
import type { FC } from 'react';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
interface AnomalyDateValueProps {
    value: number | number[];
    function: string;
    record?: MlAnomalyRecordDoc;
    fieldFormat?: FieldFormat;
}
export declare const AnomalyValueDisplay: FC<AnomalyDateValueProps>;
export {};

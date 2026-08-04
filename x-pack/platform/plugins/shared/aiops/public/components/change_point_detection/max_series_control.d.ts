import { type FC } from 'react';
import { type NumberValidationResult } from '@kbn/ml-agg-utils';
export declare const MaxSeriesControl: FC<{
    disabled?: boolean;
    value: number;
    onChange: (update: number) => void;
    onValidationChange?: (result: NumberValidationResult | null) => void;
    inline?: boolean;
}>;

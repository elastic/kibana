import type { ChangePointAggregationFunction } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import type { FC } from 'react';
interface FunctionPickerProps {
    value: ChangePointAggregationFunction;
    onChange: (value: ChangePointAggregationFunction) => void;
}
export declare const FunctionPicker: FC<FunctionPickerProps>;
export {};

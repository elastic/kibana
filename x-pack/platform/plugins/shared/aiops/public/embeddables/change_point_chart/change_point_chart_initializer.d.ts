import type { FC } from 'react';
import type { ChangePointEmbeddableState } from '../../../common/embeddables/change_point_chart/types';
export interface AnomalyChartsInitializerProps {
    initialInput?: Partial<ChangePointEmbeddableState>;
    onCreate: (props: ChangePointEmbeddableState) => void;
    onCancel: () => void;
}
export declare const ChangePointChartInitializer: FC<AnomalyChartsInitializerProps>;
export type FormControlsProps = Pick<ChangePointEmbeddableState, 'metricField' | 'splitField' | 'fn' | 'maxSeriesToPlot' | 'partitions'>;
export declare const FormControls: FC<{
    formInput?: FormControlsProps;
    onChange: (update: FormControlsProps) => void;
    onValidationChange: (isValid: boolean) => void;
}>;

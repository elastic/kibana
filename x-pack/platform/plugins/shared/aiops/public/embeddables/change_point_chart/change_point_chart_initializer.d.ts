import type { FC } from 'react';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import type { ChangePointDetectionProps } from '../../shared_components/change_point_detection';
export interface AnomalyChartsInitializerProps {
    initialInput?: Partial<ChangePointChartEmbeddableState>;
    onCreate: (props: ChangePointChartEmbeddableState) => void;
    onCancel: () => void;
}
export declare const ChangePointChartInitializer: FC<AnomalyChartsInitializerProps>;
type FormControlsProps = Pick<ChangePointDetectionProps, 'fn' | 'metricField' | 'splitField' | 'partitions'> & Required<Pick<ChangePointDetectionProps, 'maxSeriesToPlot'>>;
export declare const FormControls: FC<{
    formInput?: FormControlsProps;
    onChange: (update: FormControlsProps) => void;
    onValidationChange: (isValid: boolean) => void;
}>;
export {};

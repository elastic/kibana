import type { FC } from 'react';
import type { AggFieldPair, SplitField } from '@kbn/ml-anomaly-utils';
import type { ChartSettings } from '../../../charts/common/settings';
import type { LineChartData } from '../../../../../common/chart_loader';
import type { ModelItem, Anomaly } from '../../../../../common/results_loader';
import { JOB_TYPE } from '../../../../../../../../../common/constants/new_job';
type DetectorFieldValues = Record<number, string[]>;
interface ChartGridProps {
    aggFieldPairList: AggFieldPair[];
    chartSettings: ChartSettings;
    splitField: SplitField;
    lineChartsData: LineChartData;
    modelData: Record<number, ModelItem[]>;
    anomalyData: Record<number, Anomaly[]>;
    deleteDetector?: (index: number) => void;
    jobType: JOB_TYPE;
    fieldValuesPerDetector: DetectorFieldValues;
    loading?: boolean;
}
export declare const ChartGrid: FC<ChartGridProps>;
export {};

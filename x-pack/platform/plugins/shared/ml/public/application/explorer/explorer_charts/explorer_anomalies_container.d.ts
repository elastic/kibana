import type { FC } from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { MlEntityFieldOperation } from '@kbn/ml-anomaly-utils';
import type { TimeBuckets } from '@kbn/ml-time-buckets';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { MlLocator } from '@kbn/ml-common-types/locator';
import type { ExplorerChartsData } from './explorer_charts_container_service';
import type { AnomaliesTableData } from '../explorer_utils';
import type { SeverityOption } from '../hooks/use_severity_options';
interface ExplorerAnomaliesContainerProps {
    id: string;
    chartsData: ExplorerChartsData;
    showCharts: boolean;
    severity: SeverityThreshold[];
    setSeverity: (severity: SeverityOption[]) => void;
    mlLocator: MlLocator;
    tableData: AnomaliesTableData;
    timeBuckets: TimeBuckets;
    timefilter: TimefilterContract;
    onSelectEntity: (fieldName: string, fieldValue: string, operation: MlEntityFieldOperation) => void;
    showSelectedInterval?: boolean;
    chartsService: ChartsPluginStart;
    timeRange: {
        from: string;
        to: string;
    } | undefined;
    showFilterIcons: boolean;
}
export declare const ExplorerAnomaliesContainer: FC<ExplorerAnomaliesContainerProps>;
export {};

import type { DatasetQualityControllerStateService } from '../../state_machines/dataset_quality_controller';
import type { ITelemetryClient } from '../../services/telemetry';
export interface DatasetQualityContextValue {
    service: DatasetQualityControllerStateService;
    telemetryClient: ITelemetryClient;
    isDatasetQualityAllSignalsAvailable: boolean;
}
export declare const DatasetQualityContext: import("react").Context<DatasetQualityContextValue>;
export declare function useDatasetQualityContext(): DatasetQualityContextValue;

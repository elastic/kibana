import type { DatasetQualityDetailsControllerStateService } from '../../state_machines/dataset_quality_details_controller';
import type { ITelemetryClient } from '../../services/telemetry';
export interface DatasetQualityDetailsContextValue {
    service: DatasetQualityDetailsControllerStateService;
    telemetryClient: ITelemetryClient;
}
export declare const DatasetQualityDetailsContext: import("react").Context<DatasetQualityDetailsContextValue>;
export declare function useDatasetQualityDetailsContext(): DatasetQualityDetailsContextValue;

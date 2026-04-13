import type { EuiBasicTableColumn } from '@elastic/eui';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { BrowserUrlService } from '@kbn/share-plugin/public';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import type { TimeRangeConfig } from '../../../../common/types';
export declare const getDatasetQualityTableColumns: ({ fieldFormats, canUserMonitorAnyDataset, canUserMonitorAnyDataStream, loadingDataStreamStats, loadingDocStats, loadingDegradedStats, loadingFailedStats, showFullDatasetNames, isActiveDataset, timeRange, urlService, canReadFailureStore, }: {
    fieldFormats: FieldFormatsStart;
    canUserMonitorAnyDataset: boolean;
    canUserMonitorAnyDataStream: boolean;
    loadingDataStreamStats: boolean;
    loadingDocStats: boolean;
    loadingDegradedStats: boolean;
    loadingFailedStats: boolean;
    showFullDatasetNames: boolean;
    isActiveDataset: (lastActivity: number) => boolean;
    timeRange: TimeRangeConfig;
    urlService: BrowserUrlService;
    canReadFailureStore: boolean;
}) => Array<EuiBasicTableColumn<DataStreamStat>>;

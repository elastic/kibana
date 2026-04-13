import type { DataStreamDocsStat } from '../../common/api_types';
import type { DataStreamStatType } from '../../common/data_streams_stats/types';
import type { Integration } from '../../common/data_streams_stats/integration';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import type { DictionaryType } from '../state_machines/dataset_quality_controller/src/types';
export declare function generateDatasets(dataStreamStats: DataStreamStatType[] | undefined, degradedDocStats: DataStreamDocsStat[] | undefined, failedDocStats: DataStreamDocsStat[] | undefined, integrations: Integration[], totalDocsStats: DictionaryType<DataStreamDocsStat>): DataStreamStat[];

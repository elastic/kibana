export type { FieldDataRowProps } from './field_data_row';
import type { FieldVisConfig, FileBasedFieldVisConfig, MetricFieldVisStats } from '../../../../../../common/types/field_vis_config';
export type DataVisualizerTableItem = FieldVisConfig | FileBasedFieldVisConfig;
export type { FieldVisConfig, FileBasedFieldVisConfig, MetricFieldVisStats };
export { isFileBasedFieldVisConfig, isIndexBasedFieldVisConfig, } from '../../../../../../common/types/field_vis_config';

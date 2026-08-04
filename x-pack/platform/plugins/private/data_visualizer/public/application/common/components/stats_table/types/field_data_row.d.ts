import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { FieldVisConfig, FileBasedFieldVisConfig } from '../../../../../../common/types/field_vis_config';
export interface FieldDataRowProps {
    config: FieldVisConfig | FileBasedFieldVisConfig;
    onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}

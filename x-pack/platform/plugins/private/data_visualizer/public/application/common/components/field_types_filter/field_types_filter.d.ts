import type { FC } from 'react';
import type { FileBasedFieldVisConfig, FileBasedUnknownFieldVisConfig } from '../../../../../common/types/field_vis_config';
interface Props {
    fields: Array<FileBasedFieldVisConfig | FileBasedUnknownFieldVisConfig>;
    setVisibleFieldTypes(q: string[]): void;
    visibleFieldTypes: string[];
}
export declare const DataVisualizerFieldTypesFilter: FC<Props>;
export {};

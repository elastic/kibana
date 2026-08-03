import type { FC } from 'react';
import type { FileBasedFieldVisConfig, FileBasedUnknownFieldVisConfig } from '../../../../../common/types/field_vis_config';
interface Props {
    fields: Array<FileBasedFieldVisConfig | FileBasedUnknownFieldVisConfig>;
    setVisibleFieldNames(q: string[]): void;
    visibleFieldNames: string[];
}
export declare const DataVisualizerFieldNamesFilter: FC<Props>;
export {};

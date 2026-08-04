import type { FC } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
/**
 * Thin wrapper around `MlDataSourcePicker` that sources its services from
 * the data_visualizer Kibana context. Falls back to a static data-view title
 * when the optional services required by the picker (`dataViewFieldEditor`,
 * `contentManagement`) are not present.
 */
export declare const DataVisualizerDataSourcePicker: FC<{
    currentDataView: DataView | null;
    onFieldSaved?: () => void;
}>;

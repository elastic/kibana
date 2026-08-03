import type { FC } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
/**
 * Thin wrapper around `MlDataSourcePicker` that sources its services from
 * `AiopsAppContext`. Falls back to a static data-view title when the optional
 * services required by the picker (`dataViewFieldEditor`, `contentManagement`)
 * are not present in the context (e.g. embeddable / non-ML hosts).
 */
export declare const AiopsDataSourcePicker: FC<{
    currentDataView: DataView | null;
}>;

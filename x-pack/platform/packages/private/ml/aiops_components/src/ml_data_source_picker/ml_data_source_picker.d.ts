import type { ComponentType, FC } from 'react';
import type { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import type { MlOpenSessionFlyoutProps, MlOpenSessionFlyoutServices } from './ml_open_session_flyout';
export type { DataViewPickerProps };
export interface MlDataSourcePickerServices extends MlOpenSessionFlyoutServices {
    dataViews: DataViewsPublicPluginStart;
    dataViewEditor?: DataViewEditorStart;
    dataViewFieldEditor: DataViewFieldEditorStart;
}
export interface MlDataSourcePickerProps {
    currentDataView: DataView | null;
    services: MlDataSourcePickerServices;
    DataViewPickerComponent: ComponentType<DataViewPickerProps>;
    SavedObjectFinderComponent: MlOpenSessionFlyoutProps['SavedObjectFinderComponent'];
    /** Called after a field is saved via the field editor */
    onFieldSaved?: () => void;
}
export declare const MlDataSourcePicker: FC<MlDataSourcePickerProps>;

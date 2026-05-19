import type { AnalyticsServiceStart, CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
export type FileUploadKibanaReactContextValue = KibanaReactContextValue<FileUploadStartDependencies>;
export interface FileUploadStartDependencies {
    analytics: AnalyticsServiceStart;
    fileUpload: FileUploadPluginStart;
    share: SharePluginStart;
    fieldFormats: FieldFormatsStart;
    data: DataPublicPluginStart;
    uiActions: UiActionsStart;
    uiSettings: CoreStart['uiSettings'];
    http: CoreStart['http'];
    application: CoreStart['application'];
    notifications: CoreStart['notifications'];
    coreStart: CoreStart;
}
export declare const useFileUploadKibana: () => KibanaReactContextValue<Partial<CoreStart> & FileUploadStartDependencies>;

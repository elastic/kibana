import type { CoreSetup } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart, FieldFormatsSetup } from '@kbn/field-formats-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { EditorFrameSetup } from '@kbn/lens-common';
import type { KqlPluginStart } from '@kbn/kql/public';
export type { PersistedIndexPatternLayer, FormulaPublicApi } from '@kbn/lens-common';
export interface FormBasedDatasourceSetupPlugins {
    expressions: ExpressionsSetup;
    fieldFormats: FieldFormatsSetup;
    data: DataPublicPluginSetup;
    editorFrame: EditorFrameSetup;
    charts: ChartsPluginSetup;
}
export interface FormBasedDatasourceStartPlugins {
    data: DataPublicPluginStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    kql: KqlPluginStart;
    share?: SharePluginStart;
    fieldFormats: FieldFormatsStart;
    dataViewFieldEditor: IndexPatternFieldEditorStart;
    dataViews: DataViewsPublicPluginStart;
    uiActions: UiActionsStart;
}
export declare class FormBasedDatasource {
    setup(core: CoreSetup<FormBasedDatasourceStartPlugins>, { fieldFormats: fieldFormatsSetup, expressions, editorFrame, charts, }: FormBasedDatasourceSetupPlugins): void;
}

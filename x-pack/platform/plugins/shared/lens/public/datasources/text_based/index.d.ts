import type { CoreSetup } from '@kbn/core/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EditorFrameSetup } from '@kbn/lens-common';
export interface TextBasedSetupPlugins {
    data: DataPublicPluginSetup;
    editorFrame: EditorFrameSetup;
}
export interface TextBasedStartPlugins {
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    expressions: ExpressionsStart;
}
export declare class TextBasedDatasource {
    constructor();
    setup(core: CoreSetup<TextBasedStartPlugins>, { editorFrame }: TextBasedSetupPlugins): void;
}

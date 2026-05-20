import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FormatFactory } from '@kbn/visualization-ui-components';
import type { EditorFrameSetup } from '@kbn/lens-common';
interface DatatableVisualizationPluginStartPlugins {
    data: DataPublicPluginStart;
}
export interface DatatableVisualizationPluginSetupPlugins {
    expressions: ExpressionsSetup;
    formatFactory: FormatFactory;
    editorFrame: EditorFrameSetup;
    charts: ChartsPluginSetup;
}
export declare class DatatableVisualization {
    setup(core: CoreSetup<DatatableVisualizationPluginStartPlugins, void>, { expressions, formatFactory, editorFrame, charts }: DatatableVisualizationPluginSetupPlugins): void;
}
export {};

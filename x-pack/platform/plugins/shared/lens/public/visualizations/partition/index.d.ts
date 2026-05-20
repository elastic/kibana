import type { CoreSetup } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { FormatFactory } from '@kbn/visualization-ui-components';
import type { EditorFrameSetup } from '@kbn/lens-common';
export interface PieVisualizationPluginSetupPlugins {
    editorFrame: EditorFrameSetup;
    charts: ChartsPluginSetup;
    formatFactory: FormatFactory;
}
export interface PieVisualizationPluginStartPlugins {
    uiActions: UiActionsStart;
}
export declare class PieVisualization {
    setup(core: CoreSetup, { editorFrame, formatFactory, charts }: PieVisualizationPluginSetupPlugins): void;
}

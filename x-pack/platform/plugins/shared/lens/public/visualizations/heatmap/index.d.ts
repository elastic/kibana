import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '@kbn/lens-common';
export interface HeatmapVisualizationPluginSetupPlugins {
    editorFrame: EditorFrameSetup;
    charts: ChartsPluginSetup;
}
export declare class HeatmapVisualization {
    setup(core: CoreSetup, { editorFrame, charts }: HeatmapVisualizationPluginSetupPlugins): void;
}

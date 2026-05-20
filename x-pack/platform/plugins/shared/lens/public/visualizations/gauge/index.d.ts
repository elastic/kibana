import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '@kbn/lens-common';
export interface GaugeVisualizationPluginSetupPlugins {
    editorFrame: EditorFrameSetup;
    charts: ChartsPluginSetup;
}
export declare class GaugeVisualization {
    setup(core: CoreSetup, { editorFrame, charts }: GaugeVisualizationPluginSetupPlugins): void;
}
